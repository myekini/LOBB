export const LOBB_COMMISSION_RATE = 0.05;

export function coachNetAmount(grossNgn: number) {
  return Math.max(0, grossNgn - Math.round(grossNgn * LOBB_COMMISSION_RATE));
}

export function hoursUntilSession(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

// ─── 3-tier cancellation policy ───────────────────────────────────────────────
//
//  Coach / admin cancels  → player always gets 100% back (their fault)
//  Player cancels ≥ 24 hr → 100% refund
//  Player cancels 2–24 hr → 50% refund (coach kept preparation time)
//  Player cancels < 2 hr  → 0% refund
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
  if (cancelledBy === "coach" || cancelledBy === "admin") {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Full refund — session was cancelled by the coach.",
    };
  }

  const hours = hoursUntilSession(startsAt);

  if (hours >= 24) {
    return {
      refundPercent: 100,
      label: "Full refund",
      note: "Cancelling more than 24 hrs before — full refund in 5–7 business days.",
    };
  }

  if (hours >= 2) {
    return {
      refundPercent: 50,
      label: "50% refund",
      note: "Late cancellation (2–24 hrs before) — 50% refund in 5–7 business days.",
    };
  }

  return {
    refundPercent: 0,
    label: "No refund",
    note: "Cancellation within 2 hrs of the session — no refund applies.",
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
