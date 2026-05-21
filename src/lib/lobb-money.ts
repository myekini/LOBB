export const LOBB_COMMISSION_RATE = 0.05;

export function coachNetAmount(grossNgn: number) {
  return Math.max(0, grossNgn - Math.round(grossNgn * LOBB_COMMISSION_RATE));
}

export function cancellationPolicyNote(startsAt: string) {
  const hoursUntilSession = (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);

  if (hoursUntilSession >= 24) {
    return "Full refund applies because cancellation is more than 24 hours before the session.";
  }

  return "Late cancellation: refund may be limited under the LOBB cancellation policy.";
}

export function hoursUntilSession(startsAt: string) {
  return (new Date(startsAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

export function canCancelForFullRefund(startsAt: string) {
  return hoursUntilSession(startsAt) >= 24;
}
