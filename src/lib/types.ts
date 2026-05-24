// Shared platform types derived from the DB schema.
// Keep in sync with supabase/migrations/*.sql

export type CoachStatus = "draft" | "pending_review" | "active" | "paused" | "suspended" | "rejected";
export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "cancelled_by_player"
  | "cancelled_by_coach"
  | "disputed"
  | "refunded";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";
export type UserRole = "player" | "coach" | "admin";
export type CourtAccess = "coach_has_access" | "player_arranges" | "coach_can_recommend";

// ─── Coach ────────────────────────────────────────────────────────────────────

/** Full coach row as stored in DB (includes all editable fields) */
export type CoachRow = {
  id: string;
  full_name: string;
  bio: string | null;
  headline: string | null;
  hourly_rate_ngn: number | null;
  experience_years: number;
  primary_location: string | null;
  service_areas: string[];
  skill_levels: string[];
  specializations: string[];
  languages: string[];
  certifications: string[];
  court_access: CourtAccess;
  demo_video_url: string | null;
  profile_photo_url: string | null;
  paystack_subaccount_code: string | null;
  bank_account_number: string | null;
  bank_code: string | null;
  bank_name: string | null;
  slug: string | null;
  status: CoachStatus;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

/** Public profile returned by the coach_profiles_public view */
export type CoachPublicProfile = Omit<
  CoachRow,
  "paystack_subaccount_code" | "updated_at"
> & {
  avg_rating: number | null;
  review_count: number;
  session_count: number;
  has_availability: boolean;
};

// ─── Availability ─────────────────────────────────────────────────────────────

/** One recurring weekly availability window (0=Sun … 6=Sat) */
export type CoachAvailabilityRow = {
  id: string;
  coach_id: string;
  day_of_week: number; // 0–6
  starts_at: string;   // "HH:MM:SS"
  ends_at: string;     // "HH:MM:SS"
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** A date on which the coach is unavailable */
export type CoachAvailabilityBlock = {
  id: string;
  coach_id: string;
  blocked_date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
};

/** One concrete unavailable slot inside an otherwise open weekly window */
export type CoachAvailabilitySlotBlock = {
  id: string;
  coach_id: string;
  slot_starts_at: string;
  slot_ends_at: string;
  reason: string | null;
  created_at: string;
};

/** One bookable 60-min slot returned by get_coach_available_slots */
export type AvailableSlot = {
  slot_starts_at: string; // ISO timestamp
  slot_ends_at: string;
};

// ─── Booking ──────────────────────────────────────────────────────────────────

export type BookingRow = {
  id: string;
  coach_id: string;
  player_id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: BookingStatus;
  hourly_rate_ngn: number;
  platform_fee_ngn: number;
  total_amount_ngn: number;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  location_note: string | null;
  player_note: string | null;
  gross_amount: number;
  platform_commission_ngn: number;
  convenience_fee_ngn: number;
  coach_payout_ngn: number;
  paystack_reference: string | null;
  paystack_transfer_code: string | null;
  player_notes: string | null;
  cancelled_by: "player" | "coach" | "admin" | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  escrow_released_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Booking joined with coach profile, player profile, and payment record */
export type BookingWithDetails = BookingRow & {
  coach_full_name: string;
  coach_phone: string | null;
  coach_profile_photo_url: string | null;
  coach_slug: string | null;
  player_full_name: string;
  player_phone: string | null;
  player_avatar_url: string | null;
  paystack_reference: string | null;
  payment_status: PaymentStatus | null;
  paid_at: string | null;
};

/** Slot lock record */
export type SlotLock = {
  id: string;
  coach_id: string;
  slot_starts_at: string;
  locked_by: string;
  booking_id: string | null;
  expires_at: string;
  created_at: string;
};

// ─── Review ───────────────────────────────────────────────────────────────────

export type ReviewRow = {
  id: string;
  booking_id: string;
  coach_id: string;
  player_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  phone_number: string | null;
  email: string | null;
  email_verified_at: string | null;
  email_notifications_enabled: boolean;
  marketing_emails_enabled: boolean;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const LAGOS_LOCATIONS = [
  "Lekki",
  "Victoria Island",
  "Ikoyi",
  "Ajah",
  "Magodo",
  "Gbagada",
  "Yaba",
  "Surulere",
  "Ikeja",
  "Maryland",
  "Oniru",
  "Banana Island",
  "Chevron",
  "Sangotedo",
] as const;

export type CourtVenueType = "club" | "public" | "estate" | "stadium";
export type CourtVenueAccess = "open" | "members_only" | "members_weekday_restricted";

export type LagosCourtEntry = {
  id: string;
  name: string;
  venue: string;
  area: string;
  address: string;
  type: CourtVenueType;
  accessRule: CourtVenueAccess;
  publicNote?: string;
  courtCount?: number;
  isNationalStadium?: boolean;
};

export type NationalStadiumCourt = {
  id: string;
  label: string;
  isMemberCourt: boolean;
  publicWeekdaysBefore4pm: boolean;
  notes?: string;
};

export const NATIONAL_STADIUM_COURTS: NationalStadiumCourt[] = [
  // 3 front courts — members only except weekdays before 4pm
  { id: "nat_front_1", label: "Front Court 1", isMemberCourt: true, publicWeekdaysBefore4pm: true, notes: "Members only · Open weekdays before 4pm" },
  { id: "nat_front_2", label: "Front Court 2", isMemberCourt: true, publicWeekdaysBefore4pm: true, notes: "Members only · Open weekdays before 4pm" },
  { id: "nat_front_3", label: "Front Court 3", isMemberCourt: true, publicWeekdaysBefore4pm: true, notes: "Members only · Open weekdays before 4pm" },
  // Center court — open to all
  { id: "nat_center",  label: "Center Court",  isMemberCourt: false, publicWeekdaysBefore4pm: false },
  // 3 back courts — open to all
  { id: "nat_back_1",  label: "Back Court 1",  isMemberCourt: false, publicWeekdaysBefore4pm: false },
  { id: "nat_back_2",  label: "Back Court 2",  isMemberCourt: false, publicWeekdaysBefore4pm: false },
  { id: "nat_back_3",  label: "Back Court 3",  isMemberCourt: false, publicWeekdaysBefore4pm: false },
];

export const LAGOS_COURTS: LagosCourtEntry[] = [
  {
    id: "national_stadium",
    name: "National Stadium Tennis Courts",
    venue: "National Stadium",
    area: "Surulere",
    address: "National Stadium, Surulere, Lagos",
    type: "stadium",
    accessRule: "members_weekday_restricted",
    publicNote: "7 courts: 3 front (members), 1 center, 3 back. Saturday mornings are peak — book early.",
    courtCount: 7,
    isNationalStadium: true,
  },
  {
    id: "lagos_lawn_tennis_club",
    name: "Lagos Lawn Tennis Club",
    venue: "Lagos Lawn Tennis Club",
    area: "Lagos Island",
    address: "Glover Road, Lagos Island",
    type: "club",
    accessRule: "open",
    courtCount: 6,
  },
  {
    id: "lagos_country_club",
    name: "Lagos Country Club",
    venue: "Lagos Country Club",
    area: "Ikeja",
    address: "Ikeja, Lagos",
    type: "club",
    accessRule: "members_only",
    publicNote: "Members and their guests only.",
    courtCount: 4,
  },
  {
    id: "ikoyi_club",
    name: "Ikoyi Club Tennis Courts",
    venue: "Ikoyi Club 1938",
    area: "Ikoyi",
    address: "Ikoyi Club 1938, Lagos",
    type: "club",
    accessRule: "members_only",
    publicNote: "Members and signed-in guests only.",
    courtCount: 5,
  },
  {
    id: "lekki_tennis_club",
    name: "Lekki Tennis Club",
    venue: "Lekki Tennis Club",
    area: "Lekki",
    address: "Lekki Phase 1, Lagos",
    type: "club",
    accessRule: "open",
    courtCount: 3,
  },
  {
    id: "chevron_estate_courts",
    name: "Chevron Estate Courts",
    venue: "Chevron Tennis Courts",
    area: "Chevron",
    address: "Chevron Drive, Lekki, Lagos",
    type: "estate",
    accessRule: "open",
    courtCount: 2,
  },
  {
    id: "oniru_courts",
    name: "Oniru Estate Tennis",
    venue: "Oniru Estate Club",
    area: "Oniru",
    address: "Oniru Estate, Victoria Island Extension, Lagos",
    type: "estate",
    accessRule: "open",
    courtCount: 2,
  },
  {
    id: "eko_atlantic_courts",
    name: "Eko Atlantic Tennis Courts",
    venue: "Eko Atlantic City",
    area: "Victoria Island",
    address: "Eko Atlantic City, Victoria Island, Lagos",
    type: "club",
    accessRule: "open",
    courtCount: 2,
  },
  {
    id: "gbagada_tennis_courts",
    name: "Gbagada Tennis Club",
    venue: "Gbagada Tennis Club",
    area: "Gbagada",
    address: "Gbagada, Lagos",
    type: "club",
    accessRule: "open",
    courtCount: 2,
  },
  {
    id: "terrakulture_courts",
    name: "Terra Kulture Courts",
    venue: "Terra Kulture Arena",
    area: "Victoria Island",
    address: "Plot 1376 Tiamiyu Savage Street, Victoria Island, Lagos",
    type: "club",
    accessRule: "open",
    courtCount: 2,
  },
];

export const SPECIALIZATION_OPTIONS = [
  "Beginners",
  "Kids (5–12)",
  "Teens",
  "Adults",
  "Competitive",
  "Fitness Tennis",
  "Return to Tennis",
] as const;

export const SKILL_LEVEL_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All levels",
] as const;

export const CERTIFICATION_OPTIONS = [
  "ITF Level 1",
  "ITF Level 2",
  "ITF Level 3",
  "LTA Level 1",
  "LTA Level 2",
  "LTA Level 3",
  "USPTA",
  "PTR",
  "PTCAN",
  "NTF Certified",
  "No formal certification",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Yoruba",
  "Igbo",
  "Hausa",
  "French",
  "Pidgin",
] as const;

export const COURT_ACCESS_OPTIONS = [
  { value: "coach_has_access" as CourtAccess, label: "I have access to courts" },
  { value: "player_arranges" as CourtAccess, label: "Player must arrange court" },
  { value: "coach_can_recommend" as CourtAccess, label: "I can recommend courts nearby" },
] as const;

export const HOURLY_RATE_OPTIONS = [
  5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000, 50000,
] as const;
