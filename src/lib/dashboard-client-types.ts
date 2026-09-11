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

export type JoinedCoachProfile = {
  phone_number: string | null;
};

export type JoinedPlayerProfile = {
  phone_number: string | null;
  avatar_url?: string | null;
};

export type JoinedPlayer = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
};

export type JoinedReview = {
  id: string;
  rating: number;
  comment: string | null;
  removed_at: string | null;
};

export type DashboardBooking = {
  id: string;
  human_ref?: string | null;
  coach_id: string;
  player_id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  location_venue_id: string | null;
  location_court_id: string | null;
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
  coach_profile?: JoinedCoachProfile | JoinedCoachProfile[] | null;
  player_profile?: JoinedPlayerProfile | JoinedPlayerProfile[] | null;
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

// Canonical participant names for compact admin/dashboard identity cells.
export function sessionParties(booking: {
  coaches: { full_name: string | null } | { full_name: string | null }[] | null;
  players: { full_name: string | null } | { full_name: string | null }[] | null;
}) {
  return {
    coach: firstJoin(booking.coaches)?.full_name ?? "Coach",
    player: firstJoin(booking.players)?.full_name ?? "Player",
  };
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

export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/** Public-facing booking reference. Never expose a raw UUID fragment in UI. */
export function bookingReference(booking: { id: string; human_ref?: string | null }) {
  return booking.human_ref ?? `LOBB-${booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// Long form for confirmation / receipt surfaces: "Monday, 3 March at 2:00 PM".
export function formatSessionDateTime(iso: string, opts: { withYear?: boolean } = {}) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(opts.withYear ? { year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

export function money(amount: number) {
  return `₦${(amount ?? 0).toLocaleString("en-NG")}`;
}

export function durationMinutes(startsAt: string, endsAt: string) {
  return Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
}
