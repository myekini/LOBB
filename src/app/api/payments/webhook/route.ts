import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paystack";
import {
  type NotificationBookingInfo,
} from "@/lib/notification-messages";
import { queueBookingReminderEmails, sendBookingConfirmedEmails, sendOpsAlertEmail, sendPaymentReceiptEmail } from "@/lib/email-notifications";
import { sendBookingConfirmedSms } from "@/lib/sms-notifications";

// Paystack requires raw body for signature verification — do NOT parse via middleware
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Cannot read body" }, { status: 400 });
  }

  // ── Signature verification ─────────────────────────────────────────────────
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Refund lifecycle: keep payments.status truthful end-to-end ──────────────
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    const txRef = (event.data.transaction_reference ?? event.data.reference) as string | undefined;
    if (!txRef) return NextResponse.json({ ok: true });

    const { data: payment } = await admin
      .from("payments")
      .select("id, booking_id, amount_ngn, status")
      .eq("paystack_reference", txRef)
      .maybeSingle();
    if (!payment) return NextResponse.json({ ok: true });

    if (event.event === "refund.processed") {
      const refundedKobo = Number(event.data.amount ?? 0);
      const fullRefund = refundedKobo >= payment.amount_ngn * 100;
      await admin
        .from("payments")
        .update({ status: fullRefund ? "refunded" : "partial_refund" })
        .eq("id", payment.id);
    } else {
      // A refund we promised the player did NOT go through — act today.
      waitUntil(
        sendOpsAlertEmail(admin, "Paystack refund FAILED", [
          ["Transaction", txRef],
          ["Booking", payment.booking_id],
          ["Amount (kobo)", String(event.data.amount ?? "unknown")],
          ["Action", "Retry the refund from the Paystack dashboard, then tell the player."],
        ], { urgent: true, dedupeKey: `refund_failed_${txRef}` })
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── Chargebacks: the bank-side dispute clock is short — alert immediately ───
  if (event.event === "charge.dispute.create" || event.event === "charge.dispute.remind") {
    const txRef = ((event.data.transaction as Record<string, unknown> | undefined)?.reference ??
      event.data.reference) as string | undefined;
    waitUntil(
      sendOpsAlertEmail(admin, "Paystack chargeback opened", [
        ["Transaction", txRef ?? "unknown"],
        ["Due by", String(event.data.due_at ?? "check dashboard")],
        ["Action", "Respond with evidence in the Paystack dashboard BEFORE the deadline or it auto-resolves against LOBB."],
      ], { urgent: true, dedupeKey: `chargeback_${txRef ?? "unknown"}` })
    );
    return NextResponse.json({ ok: true });
  }

  // ── Failed/reversed coach transfers: reopen for the cron to retry ───────────
  if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
    const transferRef = event.data.reference as string | undefined;
    // Payout references are `{payment_reference}-payout`
    const paymentRef = transferRef?.replace(/-payout$/, "");
    if (paymentRef) {
      await admin
        .from("bookings")
        .update({
          paystack_transfer_code: null,
          transfer_last_error: `Paystack ${event.event}: ${String(event.data.reason ?? "no reason given")}`,
        })
        .eq("paystack_reference", paymentRef);
    }
    waitUntil(
      sendOpsAlertEmail(admin, "Coach payout transfer failed", [
        ["Transfer ref", transferRef ?? "unknown"],
        ["Reason", String(event.data.reason ?? "unknown")],
        ["Action", "Cron will retry automatically; check the coach's bank details if it repeats."],
      ], { dedupeKey: `transfer_failed_${transferRef ?? "unknown"}` })
    );
    return NextResponse.json({ ok: true });
  }

  // Only successful charges beyond this point
  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data.reference as string;
  if (!reference) return NextResponse.json({ ok: true });

  // ── Idempotency: skip if already processed ─────────────────────────────────
  const { data: existing } = await admin
    .from("paystack_events")
    .select("id, processed_at")
    .eq("reference", reference)
    .maybeSingle();

  if (existing?.processed_at) {
    return NextResponse.json({ ok: true }); // already handled
  }

  // Record the event (upsert in case we receive it before the verify endpoint ran)
  await admin.from("paystack_events").upsert(
    { event: event.event, reference, payload: event.data },
    { onConflict: "reference" }
  );

  // ── Find payment by reference ──────────────────────────────────────────────
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select("id, booking_id, status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (payErr || !payment?.booking_id) {
    // Payment not found yet — might arrive before booking row; safe to skip
    return NextResponse.json({ ok: true });
  }

  if (payment.status === "paid") {
    // Already confirmed via verify endpoint — mark processed and return
    await admin
      .from("paystack_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("reference", reference);
    return NextResponse.json({ ok: true });
  }

  // ── Confirm payment ────────────────────────────────────────────────────────
  await admin
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(), raw_payload: event.data })
    .eq("id", payment.id);

  // ── Confirm booking ────────────────────────────────────────────────────────
  const { data: booking } = await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", payment.booking_id)
    .in("status", ["pending", "pending_payment"])
    .select("id, human_ref, coach_id, player_id, starts_at, ends_at, location, player_notes, hourly_rate_ngn, convenience_fee_ngn, total_amount_ngn")
    .maybeSingle();

  // ── Remove slot lock ───────────────────────────────────────────────────────
  if (booking) {
    await admin
      .from("slot_locks")
      .delete()
      .eq("booking_id", booking.id);
  }

  // ── Mark event processed ───────────────────────────────────────────────────
  await admin
    .from("paystack_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("reference", reference);

  // ── Dispatch notifications after returning 200 to Paystack ─────────────────
  // waitUntil keeps the function alive until the work finishes without blocking
  // the HTTP response — Paystack gets its 200 immediately.
  if (booking) {
    const capturedBooking = booking;
    const capturedReference = reference;
    waitUntil(
      (async () => {
        const [coachProfile, playerProfile] = await Promise.all([
          admin
            .from("profiles")
            .select("id, phone_number, email, email_notifications_enabled, full_name")
            .eq("id", capturedBooking.coach_id)
            .single(),
          admin
            .from("profiles")
            .select("id, phone_number, email, email_notifications_enabled, full_name")
            .eq("id", capturedBooking.player_id)
            .single(),
        ]);

        const startMs = new Date(capturedBooking.starts_at).getTime();
        const info = {
          bookingId:         capturedBooking.id,
          humanRef:          capturedBooking.human_ref ?? null,
          coachName:         coachProfile.data?.full_name  ?? "Your coach",
          playerName:        playerProfile.data?.full_name ?? "Your player",
          startsAt:          capturedBooking.starts_at,
          endsAt:            capturedBooking.ends_at,
          location:          capturedBooking.location,
          playerNotes:       capturedBooking.player_notes,
          reference:         capturedReference,
          coachPhone:        coachProfile.data?.phone_number  ?? null,
          playerPhone:       playerProfile.data?.phone_number ?? null,
          paidAt:            new Date().toISOString(),
          sessionFeeNgn:     capturedBooking.hourly_rate_ngn,
          convenienceFeeNgn: capturedBooking.convenience_fee_ngn,
          totalAmountNgn:    capturedBooking.total_amount_ngn,
          paymentStatus:     "paid",
          paymentMethod:     "Paystack",
        };
        const notificationInfo: NotificationBookingInfo = info;
        const reminderAt = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
        const reviewAt   = new Date(startMs + 2  * 60 * 60 * 1000).toISOString();

        await Promise.allSettled([
          sendBookingConfirmedSms(admin, notificationInfo, playerProfile.data, coachProfile.data),
          sendBookingConfirmedEmails(admin, notificationInfo, playerProfile.data, coachProfile.data),
          sendPaymentReceiptEmail(admin, notificationInfo, playerProfile.data, coachProfile.data),
          queueBookingReminderEmails(admin, notificationInfo, playerProfile.data, coachProfile.data, reminderAt, reviewAt),
        ]);
      })()
    );
  }

  return NextResponse.json({ ok: true });
}
