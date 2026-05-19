export type JoinedPayment = {
  paystack_reference: string | null;
  status: string | null;
  paid_at: string | null;
};

export type JoinedCoach = {
  id: string;
  full_name: string;
  slug: string | null;
  profile_photo_url: string | null;
  headline: string | null;
  primary_location: string | null;
};

export type JoinedPlayer = {
  id: string;
  full_name: string;
};

export type JoinedReview = {
  id: string;
  rating: number;
  comment: string | null;
  removed_at: string | null;
};

export type DashboardBooking = {
  id: string;
  coach_id: string;
  player_id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: string;
  hourly_rate_ngn: number;
  platform_fee_ngn: number;
  total_amount_ngn: number;
  session_date: string | null;
  session_start_time: string | null;
  session_end_time: string | null;
  location_note: string | null;
  player_note: string | null;
  gross_amount: number | null;
  platform_commission_ngn: number;
  convenience_fee_ngn: number;
  coach_payout_ngn: number;
  paystack_reference: string | null;
  paystack_transfer_code: string | null;
  player_notes: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  escrow_released_at: string | null;
  created_at: string;
  coaches: JoinedCoach | JoinedCoach[] | null;
  players: JoinedPlayer | JoinedPlayer[] | null;
  payments: JoinedPayment[] | null;
  reviews: JoinedReview[] | null;
  is_upcoming?: boolean;
  can_leave_review?: boolean;
  coach_phone_visible?: boolean;
};

export function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function formatBookingDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

export function money(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function durationMinutes(startsAt: string, endsAt: string) {
  return Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
}
