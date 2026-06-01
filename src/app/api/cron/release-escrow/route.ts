import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTransfer } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // ── Pass 1: release confirmed bookings whose session ended 2+ hours ago ──────
  const { data: bookings, error: fetchError } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .lte("ends_at", twoHoursAgo)
    .is("escrow_released_at", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const ids = (bookings ?? []).map((b) => b.id);

  let released = 0;
  let dbFailed = 0;
  if (ids.length > 0) {
    const results = await Promise.allSettled(
      ids.map((id) => admin.rpc("release_escrow", { p_booking_id: id }))
    );
    released = results.filter((r) => r.status === "fulfilled").length;
    dbFailed = results.filter((r) => r.status === "rejected").length;
  }

  // ── Pass 2: transfer to coaches for all completed bookings missing a transfer ─
  // Covers both freshly released (pass 1) and previously failed transfers.
  const { data: pendingTransfers } = await admin
    .from("bookings")
    .select("id, paystack_reference, coach_payout_ngn, coach_id")
    .eq("status", "completed")
    .not("escrow_released_at", "is", null)
    .is("paystack_transfer_code", null);

  const toTransfer = pendingTransfers ?? [];
  let transferred = 0;
  let transferFailed = 0;

  if (toTransfer.length > 0) {
    // Batch-fetch coach recipient codes
    const coachIds = Array.from(new Set(toTransfer.map((b) => b.coach_id)));
    const { data: coaches } = await admin
      .from("coaches")
      .select("id, paystack_recipient_code")
      .in("id", coachIds);

    const recipientMap = new Map(
      (coaches ?? []).map((c) => [c.id, c.paystack_recipient_code])
    );

    const transferResults = await Promise.allSettled(
      toTransfer
        .filter((b) => recipientMap.get(b.coach_id) && b.coach_payout_ngn > 0)
        .map(async (b) => {
          const recipientCode = recipientMap.get(b.coach_id)!;
          const transfer = await createTransfer({
            amount_kobo: Math.round(b.coach_payout_ngn * 100),
            recipient_code: recipientCode,
            reference: b.paystack_reference ? `${b.paystack_reference}-payout` : undefined,
            reason: "LOBB session payout",
          });
          await admin
            .from("bookings")
            .update({ paystack_transfer_code: transfer.transfer_code })
            .eq("id", b.id);
        })
    );

    transferred = transferResults.filter((r) => r.status === "fulfilled").length;
    transferFailed = transferResults.filter((r) => r.status === "rejected").length;
  }

  return NextResponse.json({ released, dbFailed, transferred, transferFailed });
}
