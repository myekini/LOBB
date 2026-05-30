export const LOBB_COMMISSION_RATE = 0.05;

export function coachNetAmount(grossNgn: number) {
  return Math.max(0, grossNgn - Math.round(grossNgn * LOBB_COMMISSION_RATE));
}

export function hoursUntilSession(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

// ─── 3-tier cancellation policy ───────────────────────────────────────────────
//
//  Cancellation policy:
//  ≥ 72 hr → 100% refund
//  24–72 hr → 50% refund
//  < 24 hr → 0% refund
//
export type CancellationPolicy = {
  refundPercent: 0 | 50 | 100;
  label: string;
  note: string;
};

export function cancellationPolicy(
  startsAt: string,
  cancelledBy: "player" | "coach" | "admin" = "player"
): CancellationPolicy {
  void cancelledBy;
  const hours = hoursUntilSession(startsAt);

  if (hours >= 72) {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Cancelling more than 72 hrs before — full refund in 5–7 business days.",
    };
  }

  if (hours >= 24) {
    return {
      refundPercent: 50,
      label: "50% refund",
      note: "Cancelling 24–72 hrs before — 50% refund in 5–7 business days.",
    };
  }

  return {
    refundPercent: 0,
    label: "No refund",
    note: "Cancellation within 24 hrs of the session — no refund applies.",
  };
}

export function refundAmountNgn(totalPaidNgn: number, refundPercent: 0 | 50 | 100): number {
  return Math.round(totalPaidNgn * refundPercent / 100);
}

// Legacy helpers — kept for UI components that use the binary check
export function canCancelForFullRefund(startsAt: string) {
  return cancellationPolicy(startsAt, "player").refundPercent === 100;
}

export function cancellationPolicyNote(startsAt: string) {
  return cancellationPolicy(startsAt, "player").note;
}
