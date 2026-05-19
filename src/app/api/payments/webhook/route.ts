import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paystack";
import {
  sendPlayerBookingConfirmedSms,
  sendCoachBookingNotificationSms,
} from "@/lib/booking-sms";
import {
  bookingConfirmedCoachMessage,
  bookingConfirmedPlayerMessage,
  reminderCoachMessage,
  reminderPlayerMessage,
  reviewRequestMessage,
  type NotificationBookingInfo,
} from "@/lib/notification-messages";

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
    .eq("status", "pending")
    .select("id, coach_id, player_id, starts_at, ends_at, location, player_notes")
    .single();

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
        .select("phone_number, full_name")
        .eq("id", booking.coach_id)
        .single(),
      admin
        .from("profiles")
        .select("phone_number, full_name")
        .eq("id", booking.player_id)
        .single(),
    ]);

    const info = {
      bookingId:     booking.id,
      coachName:    coachProfile.data?.full_name  ?? "Your coach",
      playerName:   playerProfile.data?.full_name ?? "Your player",
      startsAt:     booking.starts_at,
      location:     booking.location,
      playerNotes:  booking.player_notes,
      reference,
      coachPhone:   coachProfile.data?.phone_number  ?? null,
      playerPhone:  playerProfile.data?.phone_number ?? null,
    };

    const notificationInfo: NotificationBookingInfo = info;
    const startMs = new Date(booking.starts_at).getTime();
    const reminderAt = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
    const reviewAt = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();

    const smsJobs: Array<Record<string, unknown>> = [];
    if (notificationInfo.playerPhone) {
      smsJobs.push({
        type: "booking_confirmed_player",
        recipient_user_id: booking.player_id,
        recipient_phone: notificationInfo.playerPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        message: bookingConfirmedPlayerMessage(notificationInfo),
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      smsJobs.push({
        type: "booking_24h_reminder_player",
        recipient_user_id: booking.player_id,
        recipient_phone: notificationInfo.playerPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reminderAt,
        message: reminderPlayerMessage(notificationInfo),
      });
      smsJobs.push({
        type: "review_request_player",
        recipient_user_id: booking.player_id,
        recipient_phone: notificationInfo.playerPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reviewAt,
        message: reviewRequestMessage(notificationInfo),
      });
    }
    if (notificationInfo.coachPhone) {
      smsJobs.push({
        type: "booking_confirmed_coach",
        recipient_user_id: booking.coach_id,
        recipient_phone: notificationInfo.coachPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        message: bookingConfirmedCoachMessage(notificationInfo),
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      smsJobs.push({
        type: "booking_24h_reminder_coach",
        recipient_user_id: booking.coach_id,
        recipient_phone: notificationInfo.coachPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reminderAt,
        message: reminderCoachMessage(notificationInfo),
      });
    }

    if (smsJobs.length > 0) {
      await admin.from("sms_jobs").upsert(smsJobs, { onConflict: "booking_id,type", ignoreDuplicates: true });
    }

    await Promise.allSettled([
      sendPlayerBookingConfirmedSms(info),
      sendCoachBookingNotificationSms(info),
    ]);
  }

  return NextResponse.json({ ok: true });
}
