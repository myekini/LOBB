// Booking money math. All rates and refund percentages come from the central
// pricing system — see src/lib/config/pricing.ts. This file only adapts that
// config to the field names the booking/cancellation code already uses.
//
// SESSION_RATE        = coach's listed rate (e.g. ₦15,000)
// CONVENIENCE_FEE     = SESSION_RATE × 0.02              → ₦300    (charged to player)
// GROSS_CHARGE        = SESSION_RATE + CONVENIENCE_FEE    → ₦15,300 (player pays)
// PLATFORM_COMMISSION = SESSION_RATE × 0.10              → ₦1,500  (LOBB commission)
// COACH_PAYOUT        = SESSION_RATE − PLATFORM_COMMISSION → ₦13,500 (paid to coach)
// LOBB_RETAINED       = GROSS_CHARGE − COACH_PAYOUT       → ₦1,800  (₦1,500 + ₦300)
// Check: COACH_PAYOUT + LOBB_RETAINED = GROSS_CHARGE ✓
import { LOBB_PRICING, calculateFees } from "@/lib/config/pricing";

export const CONVENIENCE_FEE_RATE = LOBB_PRICING.fees.playerConveniencePct;
export const LOBB_COMMISSION_RATE = LOBB_PRICING.fees.coachCommissionPct;
export const COACH_SHARE_PCT = 1 - LOBB_PRICING.fees.coachCommissionPct;

export function calcBookingFees(sessionRateNgn: number) {
  const { convenienceFee, grossCharge, lobbCommission, coachPayout, lobbRetained } =
    calculateFees(sessionRateNgn);
  return {
    convenienceFee,
    grossCharge,
    platformCommission: lobbCommission,
    coachPayout,
    lobbRetained,
  };
}

export function hoursUntilSession(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

export type CancellationPolicy = {
  refundPercent: number;
  label: string;
  note: string;
};

const LATE_REFUND_PERCENT = Math.round(
  LOBB_PRICING.cancellation.lateCancellationPlayerPct * 100
);

export function cancellationPolicy(
  startsAt: string,
  cancelledBy: "player" | "coach" | "admin" = "player"
): CancellationPolicy {
  if (cancelledBy === "coach" || cancelledBy === "admin") {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Coach and admin cancellations are always refunded in full.",
    };
  }

  const hours = hoursUntilSession(startsAt);
  const freeHours = LOBB_PRICING.cancellation.freeCancellationHours;

  if (hours >= freeHours) {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: `Free cancellation up to ${freeHours} hours before the session. Refunds reach your card in 2–5 business days.`,
    };
  }

  return {
    refundPercent: LATE_REFUND_PERCENT,
    label: `${LATE_REFUND_PERCENT}% refund`,
    note: `Cancel within ${freeHours} hours and ${LATE_REFUND_PERCENT}% comes back to you; the coach keeps the rest for holding the slot.`,
  };
}

export function refundAmountNgn(totalPaidNgn: number, refundPercent: number): number {
  return Math.round((totalPaidNgn * refundPercent) / 100);
}

// Legacy helpers kept for UI components that use the binary check.
export function canCancelForFullRefund(startsAt: string) {
  return cancellationPolicy(startsAt, "player").refundPercent === 100;
}

export function cancellationPolicyNote(startsAt: string) {
  return cancellationPolicy(startsAt, "player").note;
}
