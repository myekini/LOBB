import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reminderCoachMessage,
  reminderPlayerMessage,
  reviewRequestMessage,
  type NotificationBookingInfo,
} from "@/lib/notification-messages";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const from = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("id, coach_id, player_id, starts_at, location, player_notes, coaches!bookings_coach_id_fkey(full_name), players!bookings_player_id_fkey(full_name)")
    .eq("status", "confirmed")
    .gte("starts_at", from)
    .lte("starts_at", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let created = 0;

  for (const booking of bookings ?? []) {
    const [coachProfile, playerProfile] = await Promise.all([
      admin.from("profiles").select("phone_number, full_name").eq("id", booking.coach_id).single(),
      admin.from("profiles").select("phone_number, full_name").eq("id", booking.player_id).single(),
    ]);

    const info: NotificationBookingInfo = {
      bookingId: booking.id,
      coachName: coachProfile.data?.full_name ?? firstJoin(booking.coaches)?.full_name ?? "Your coach",
      playerName: playerProfile.data?.full_name ?? firstJoin(booking.players)?.full_name ?? "Your player",
      startsAt: booking.starts_at,
      location: booking.location,
      playerNotes: booking.player_notes,
      coachPhone: coachProfile.data?.phone_number ?? null,
      playerPhone: playerProfile.data?.phone_number ?? null,
    };

    const startMs = new Date(booking.starts_at).getTime();
    const reminderAt = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
    const reviewAt = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();

    const jobs: Array<Record<string, unknown>> = [];
    if (info.playerPhone) {
      jobs.push({
        type: "booking_24h_reminder_player",
        recipient_user_id: booking.player_id,
        recipient_phone: info.playerPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reminderAt,
        message: reminderPlayerMessage(info),
      });
      jobs.push({
        type: "review_request_player",
        recipient_user_id: booking.player_id,
        recipient_phone: info.playerPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reviewAt,
        message: reviewRequestMessage(info),
      });
    }
    if (info.coachPhone) {
      jobs.push({
        type: "booking_24h_reminder_coach",
        recipient_user_id: booking.coach_id,
        recipient_phone: info.coachPhone,
        booking_id: booking.id,
        coach_id: booking.coach_id,
        scheduled_for: reminderAt,
        message: reminderCoachMessage(info),
      });
    }

    if (jobs.length > 0) {
      const { error: insertError } = await admin.from("sms_jobs").upsert(jobs, {
        onConflict: "booking_id,type",
        ignoreDuplicates: true,
      });
      if (!insertError) created += jobs.length;
    }
  }

  return NextResponse.json({ ok: true, attempted: created });
}
