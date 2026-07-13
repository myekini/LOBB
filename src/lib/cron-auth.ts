/**
 * Authorization for cron/ops endpoints.
 *
 * Vercel Cron invokes these routes with `Authorization: Bearer ${CRON_SECRET}`
 * (the CRON_SECRET project env var). Manual/admin invocations use ADMIN_SECRET
 * via Bearer or the x-admin-secret header. Accept either — previously only
 * ADMIN_SECRET was accepted, so every scheduled Vercel run was rejected with
 * 401 and escrow release/payouts/reminders never ran.
 */
export function isCronAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    if (auth === `Bearer ${adminSecret}`) return true;
    if (request.headers.get("x-admin-secret") === adminSecret) return true;
  }

  return false;
}
