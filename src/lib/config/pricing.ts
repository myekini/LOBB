// ─────────────────────────────────────────────────────────────────────────────
// LOBB — Central pricing system  ·  Pricing spec v3.1
//
// Single source of truth for every money value on the platform: the coach rate
// band, platform fees, session timing, cancellation refunds, and referral
// credits. Nothing money-related is hardcoded anywhere else — server routes,
// client screens, cron jobs, emails and DB seeds all import from this file.
//
// Fee model: 10% commission from the coach, 2% convenience fee from the player,
// the coach keeps 90%.
//
//   ₦15,000 session  →  player pays ₦15,300 · coach receives ₦13,500 · LOBB ₦1,800
//   check: 13,500 + 1,800 = 15,300 ✓
//
// What each role sees (enforced at the surface, not here):
//   Player  → grossCharge only, no fee breakdown
//   Coach   → coachPayout only, no commission line
//   Admin   → full breakdown
// ─────────────────────────────────────────────────────────────────────────────

export const LOBB_PRICING = {
  coach: {
    /** Lowest rate a coach may list, in NGN. */
    rateFloor: 5_000,
    /** Highest rate a coach may list, in NGN. */
    rateCeiling: 75_000,
    /** Rates must be a whole multiple of this, in NGN. */
    rateStep: 500,
  },
  fees: {
    /** Commission taken from the coach's rate. */
    coachCommissionPct: 0.1,
    /** Convenience fee added on top of the rate, charged to the player. */
    playerConveniencePct: 0.02,
  },
  session: {
    durationMinutes: 60,
    /** How long a slot is held for a player mid-checkout. */
    slotHoldMinutes: 10,
    /** Hours after a session ends before escrow releases to the coach. */
    escrowReleaseHours: 2,
  },
  cancellation: {
    /** Free cancellation up to this many hours before the session. */
    freeCancellationHours: 24,
    /** Player's refund when they cancel late (fraction of what they paid). */
    lateCancellationPlayerPct: 0.5,
    /** Coach's share of a late-cancelled session (fraction of the rate). */
    lateCancellationCoachPct: 0.3,
    /** LOBB's share of a late-cancelled session (fraction of the rate). */
    lobbLateCancellationPct: 0.2,
    /** Coach payout on a player no-show (fraction of the rate). */
    noShowCoachPayoutPct: 0.5,
  },
  referral: {
    /** Credit to the referring coach per referred player's first booking, NGN. */
    creditPerFirstBooking: 1_500,
    /** Referral balance a coach must reach before it pays out, NGN. */
    minimumWithdrawalBalance: 5_000,
    /** First-touch attribution cookie lifetime, in days. */
    cookieExpiryDays: 30,
  },
} as const;

// ── Fee math ─────────────────────────────────────────────────────────────────

export type FeeBreakdown = {
  /** Coach's listed rate (what the coach set). */
  sessionRate: number;
  /** Added on top, charged to the player. */
  convenienceFee: number;
  /** What the player is charged. */
  grossCharge: number;
  /** Commission LOBB takes from the coach's rate. */
  lobbCommission: number;
  /** What the coach is paid. */
  coachPayout: number;
  /** What LOBB keeps in total (commission + convenience fee). */
  lobbRetained: number;
};

/**
 * Derive every booking line-item from a coach's session rate. Pure and
 * deterministic — call it wherever fees are shown or persisted. Persisted
 * values are the record of truth for a booking; never recompute a past
 * booking's fees, read them back from the row.
 */
export function calculateFees(sessionRate: number): FeeBreakdown {
  const convenienceFee = Math.round(sessionRate * LOBB_PRICING.fees.playerConveniencePct);
  const grossCharge = sessionRate + convenienceFee;
  const lobbCommission = Math.round(sessionRate * LOBB_PRICING.fees.coachCommissionPct);
  const coachPayout = sessionRate - lobbCommission;
  const lobbRetained = grossCharge - coachPayout;
  return { sessionRate, convenienceFee, grossCharge, lobbCommission, coachPayout, lobbRetained };
}

// ── Coach rate guardrails ────────────────────────────────────────────────────

export const COACH_RATE_FLOOR = LOBB_PRICING.coach.rateFloor;
export const COACH_RATE_CEILING = LOBB_PRICING.coach.rateCeiling;
export const COACH_RATE_STEP = LOBB_PRICING.coach.rateStep;

/** Curated preset tiers for the rate pickers — every value sits within the band. */
export const COACH_RATE_PRESETS: readonly number[] = [
  5_000, 7_500, 10_000, 12_500, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000,
];

function formatNgn(value: number): string {
  return `₦${value.toLocaleString("en-NG")}`;
}

/** True when a rate is inside the band and on a valid increment. */
export function isValidCoachRate(rate: number | null | undefined): rate is number {
  return (
    typeof rate === "number" &&
    Number.isFinite(rate) &&
    rate >= COACH_RATE_FLOOR &&
    rate <= COACH_RATE_CEILING &&
    rate % COACH_RATE_STEP === 0
  );
}

/** Snap any number into the band and onto the nearest valid increment. */
export function clampCoachRate(rate: number): number {
  const stepped = Math.round(rate / COACH_RATE_STEP) * COACH_RATE_STEP;
  return Math.min(COACH_RATE_CEILING, Math.max(COACH_RATE_FLOOR, stepped));
}

/** Human-readable reason a rate is rejected, or null when it's fine. */
export function coachRateError(rate: number | null | undefined): string | null {
  if (rate == null || Number.isNaN(rate)) return "Enter your hourly rate.";
  if (rate < COACH_RATE_FLOOR) return `Minimum rate is ${formatNgn(COACH_RATE_FLOOR)}.`;
  if (rate > COACH_RATE_CEILING) return `Maximum rate is ${formatNgn(COACH_RATE_CEILING)}.`;
  if (rate % COACH_RATE_STEP !== 0) return `Rate must be in ${formatNgn(COACH_RATE_STEP)} steps.`;
  return null;
}

// ── Session timing ───────────────────────────────────────────────────────────

export const SESSION_DURATION_MINUTES = LOBB_PRICING.session.durationMinutes;
export const SLOT_HOLD_MINUTES = LOBB_PRICING.session.slotHoldMinutes;
export const ESCROW_RELEASE_HOURS = LOBB_PRICING.session.escrowReleaseHours;

// ── Referral credits ─────────────────────────────────────────────────────────

export const REFERRAL_CREDIT_NGN = LOBB_PRICING.referral.creditPerFirstBooking;
export const REFERRAL_WITHDRAWAL_THRESHOLD_NGN = LOBB_PRICING.referral.minimumWithdrawalBalance;
export const REFERRAL_COOKIE_DAYS = LOBB_PRICING.referral.cookieExpiryDays;
