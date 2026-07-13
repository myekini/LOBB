import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Runs every 15 minutes. Cancels bookings that were created but never paid:
//   - status is 'pending' or 'pending_payment'
//   - created more than 20 minutes ago (10-min lock TTL + 10-min webhook buffer)
//   - no associated payment with status 'paid'
//
// Slot locks expire after 10 minutes (making the slot re-bookable), but the orphaned
// booking record would otherwise accumulate and skew analytics/dashboard counts.
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin  = createAdminClient();
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  // Fetch candidates: stale pending bookings with their payment status
  const { data: candidates, error: fetchErr } = await admin
    .from("bookings")
    .select("id, payments(status)")
    .in("status", ["pending", "pending_payment"])
    .lt("created_at", cutoff);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  // Exclude any booking that has a paid payment (webhook may still be in flight)
  const abandonedIds = (candidates ?? [])
    .filter((b) => {
      const pmts = b.payments as { status: string }[] | null;
      return !pmts?.some((p) => p.status === "paid");
    })
    .map((b) => b.id as string);

  if (abandonedIds.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  const { data: cancelled, error: cancelErr } = await admin
    .from("bookings")
    .update({
      status:              "cancelled",
      cancellation_reason: "Payment window expired",
      cancelled_at:        new Date().toISOString(),
    })
    .in("id", abandonedIds)
    .in("status", ["pending", "pending_payment"]) // guard against concurrent confirm
    .select("id");

  if (cancelErr) {
    return NextResponse.json({ error: cancelErr.message }, { status: 500 });
  }

  const cancelledIds = (cancelled ?? []).map((b) => b.id as string);

  // Clean up orphaned slot locks attached to the now-cancelled bookings
  if (cancelledIds.length > 0) {
    await admin.from("slot_locks").delete().in("booking_id", cancelledIds);
  }

  return NextResponse.json({ cancelled: cancelledIds.length });
}
