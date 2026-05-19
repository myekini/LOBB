import type { SupabaseClient } from "@supabase/supabase-js";

const bookingSelect = `
  id,
  coach_id,
  player_id,
  starts_at,
  ends_at,
  location,
  status,
  hourly_rate_ngn,
  platform_fee_ngn,
  total_amount_ngn,
  session_date,
  session_start_time,
  session_end_time,
  location_note,
  player_note,
  gross_amount,
  platform_commission_ngn,
  convenience_fee_ngn,
  coach_payout_ngn,
  paystack_reference,
  paystack_transfer_code,
  player_notes,
  cancelled_by,
  cancelled_at,
  cancellation_reason,
  escrow_released_at,
  created_at,
  coaches!bookings_coach_id_fkey(
    id,
    full_name,
    slug,
    profile_photo_url,
    headline,
    primary_location
  ),
  players!bookings_player_id_fkey(
    id,
    full_name
  ),
  payments(
    paystack_reference,
    status,
    paid_at
  ),
  reviews(
    id,
    rating,
    comment,
    removed_at
  )
`;

export async function loadPlayerBookings(admin: SupabaseClient, playerId: string) {
  return admin
    .from("bookings")
    .select(bookingSelect)
    .eq("player_id", playerId)
    .order("starts_at", { ascending: false });
}

export async function loadCoachBookings(admin: SupabaseClient, coachId: string) {
  return admin
    .from("bookings")
    .select(bookingSelect)
    .eq("coach_id", coachId)
    .order("starts_at", { ascending: true });
}

export function canLeaveReview(booking: { status: string; starts_at: string; reviews?: unknown[] | null }) {
  return (
    booking.status === "completed" &&
    new Date(booking.starts_at).getTime() + 2 * 60 * 60 * 1000 <= Date.now() &&
    !(booking.reviews && booking.reviews.length > 0)
  );
}
