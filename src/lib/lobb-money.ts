// Canonical fee model — all booking money math derives from these three constants.
// SESSION_RATE = coach's listed rate (e.g. ₦20,000)
// CONVENIENCE_FEE  = SESSION_RATE × 0.05                    → ₦1,000  (charged to player)
// GROSS_CHARGE     = SESSION_RATE + CONVENIENCE_FEE          → ₦21,000 (player pays)
// PLATFORM_COMMISSION = SESSION_RATE × 0.15                  → ₦3,000  (LOBB commission)
// COACH_PAYOUT     = SESSION_RATE × 0.85                    → ₦17,000 (paid to coach)
// LOBB_RETAINED    = GROSS_CHARGE − COACH_PAYOUT             → ₦4,000  (₦3,000 + ₦1,000)
// Check: COACH_PAYOUT + LOBB_RETAINED = GROSS_CHARGE ✓
export const CONVENIENCE_FEE_RATE = 0.05;
export const LOBB_COMMISSION_RATE = 0.15;
export const COACH_SHARE_PCT = 0.85;

export function calcBookingFees(sessionRateNgn: number) {
  const convenienceFee = Math.round(sessionRateNgn * CONVENIENCE_FEE_RATE);
  const grossCharge = sessionRateNgn + convenienceFee;
  const platformCommission = Math.round(sessionRateNgn * LOBB_COMMISSION_RATE);
  const coachPayout = Math.round(sessionRateNgn * COACH_SHARE_PCT);
  const lobbRetained = grossCharge - coachPayout;
  return { convenienceFee, grossCharge, platformCommission, coachPayout, lobbRetained };
}

export function hoursUntilSession(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

export type CancellationPolicy = {
  refundPercent: 0 | 50 | 100;
  label: string;
  note: string;
};

export function cancellationPolicy(
  startsAt: string,
  cancelledBy: "player" | "coach" | "admin" = "player"
): CancellationPolicy {
  if (cancelledBy === "coach" || cancelledBy === "admin") {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Coach and admin cancellations always return the full payment to the player.",
    };
  }

  const hours = hoursUntilSession(startsAt);

  if (hours >= 24) {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Cancel at least 24 hours before the session for a full refund within 2 to 5 business days.",
    };
  }

  return {
    refundPercent: 50,
    label: "50% refund",
    note: "Cancelling within 24 hours of the session returns 50% to you. The coach receives a partial payment for holding the slot.",
  };
}

export function refundAmountNgn(totalPaidNgn: number, refundPercent: 0 | 50 | 100): number {
  return Math.round(totalPaidNgn * refundPercent / 100);
}

// Legacy helpers kept for UI components that use the binary check.
export function canCancelForFullRefund(startsAt: string) {
  return cancellationPolicy(startsAt, "player").refundPercent === 100;
}

export function cancellationPolicyNote(startsAt: string) {
  return cancellationPolicy(startsAt, "player").note;
}
