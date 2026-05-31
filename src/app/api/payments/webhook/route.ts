import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paystack";
import {
  type NotificationBookingInfo,
} from "@/lib/notification-messages";
import { queueBookingReminderEmails, sendBookingConfirmedEmails, sendPaymentReceiptEmail } from "@/lib/email-notifications";
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

  // Only handle successful charges
  if (event.event !== "charge.success") {
    return NextResponse.json({ ok: true });
  }

  const reference = event.data.reference as string;
  if (!reference) return NextResponse.json({ ok: true });

  const admin = createAdminClient();

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

  // ── Send SMS notifications (non-blocking; failures must not break the webhook) ──
  if (booking) {
    const [coachProfile, playerProfile] = await Promise.all([
      admin
        .from("profiles")
        .select("id, phone_number, email, email_notifications_enabled, full_name")
        .eq("id", booking.coach_id)
        .single(),
      admin
        .from("profiles")
        .select("id, phone_number, email, email_notifications_enabled, full_name")
        .eq("id", booking.player_id)
        .single(),
    ]);

    const info = {
      bookingId:     booking.id,
      humanRef:      booking.human_ref ?? null,
      coachName:    coachProfile.data?.full_name  ?? "Your coach",
      playerName:   playerProfile.data?.full_name ?? "Your player",
      startsAt:     booking.starts_at,
      endsAt:       booking.ends_at,
      location:     booking.location,
      playerNotes:  booking.player_notes,
      reference,
      coachPhone:   coachProfile.data?.phone_number  ?? null,
      playerPhone:  playerProfile.data?.phone_number ?? null,
      paidAt:       new Date().toISOString(),
      sessionFeeNgn: booking.hourly_rate_ngn,
      convenienceFeeNgn: booking.convenience_fee_ngn,
      totalAmountNgn: booking.total_amount_ngn,
      paymentStatus: "paid",
      paymentMethod: "Paystack",
    };

    const notificationInfo: NotificationBookingInfo = info;
    const startMs = new Date(booking.starts_at).getTime();
    const reminderAt = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
    const reviewAt = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();

    await Promise.allSettled([
      sendBookingConfirmedSms(admin, notificationInfo, playerProfile.data, coachProfile.data),
      sendBookingConfirmedEmails(admin, notificationInfo, playerProfile.data, coachProfile.data),
      sendPaymentReceiptEmail(admin, notificationInfo, playerProfile.data, coachProfile.data),
      queueBookingReminderEmails(admin, notificationInfo, playerProfile.data, coachProfile.data, reminderAt, reviewAt),
    ]);
  }

  return NextResponse.json({ ok: true });
}
