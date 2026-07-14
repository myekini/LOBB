import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTransfer } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
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
  const successfulIds: string[] = [];

  if (ids.length > 0) {
    const results = await Promise.allSettled(
      ids.map((id) =>
        admin.rpc("release_escrow", { p_booking_id: id }).then(() => id)
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        released++;
        successfulIds.push(r.value as string);
      } else {
        dbFailed++;
      }
    }
  }

  // ── Pass 1b: create referral credits for first-ever bookings ─────────────────
  if (successfulIds.length > 0) {
    const { data: completedBookings } = await admin
      .from("bookings")
      .select("id, player_id")
      .in("id", successfulIds);

    for (const booking of completedBookings ?? []) {
      const { data: profile } = await admin
        .from("profiles")
        .select("referred_by_coach_id")
        .eq("id", booking.player_id)
        .maybeSingle();

      if (!profile?.referred_by_coach_id) continue;

      // Only credit the first ever completed booking for this player
      const { count } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("player_id", booking.player_id)
        .eq("status", "completed");

      if (count !== 1) continue;

      // Idempotency guard: skip if credit already exists for this user
      const { data: existing } = await admin
        .from("referral_credits")
        .select("id")
        .eq("referred_user_id", booking.player_id)
        .maybeSingle();

      if (existing) continue;

      await admin.from("referral_credits").insert({
        referring_coach_id: profile.referred_by_coach_id,
        referred_user_id: booking.player_id,
        triggering_booking_id: booking.id,
        amount: 1500,
        status: "released",
        released_at: new Date().toISOString(),
      });
    }
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
        .filter((b) => recipientMap.get(b.coach_id) && b.coach_payout_ngn != null && b.coach_payout_ngn > 0)
        .map(async (b) => {
          const recipientCode = recipientMap.get(b.coach_id)!;
          try {
            const transfer = await createTransfer({
              amount_kobo: Math.round(b.coach_payout_ngn * 100),
              recipient_code: recipientCode,
              reference: b.paystack_reference ? `${b.paystack_reference}-payout` : undefined,
              reason: "LOBB session payout",
            });
            await admin
              .from("bookings")
              .update({ paystack_transfer_code: transfer.transfer_code, transfer_last_error: null })
              .eq("id", b.id);
          } catch (err) {
            // Log the error so admins can see why the transfer is stuck
            const message = err instanceof Error ? err.message : String(err);
            await admin
              .from("bookings")
              .update({ transfer_last_error: message })
              .eq("id", b.id);
            throw err;
          }
        })
    );

    transferred = transferResults.filter((r) => r.status === "fulfilled").length;
    transferFailed = transferResults.filter((r) => r.status === "rejected").length;
  }

  // ── Pass 3: pay out referral credits once a coach crosses the threshold ──────
  // Credits accrue as 'released'; batch them per coach and transfer when the
  // total reaches ₦5,000 (batching keeps transfer-fee overhead sane).
  const REFERRAL_PAYOUT_THRESHOLD_NGN = 5000;
  let referralPaid = 0;
  let referralFailed = 0;

  const { data: releasedCredits } = await admin
    .from("referral_credits")
    .select("id, referring_coach_id, amount")
    .eq("status", "released");

  const creditsByCoach = new Map<string, { ids: string[]; total: number }>();
  for (const credit of releasedCredits ?? []) {
    const entry = creditsByCoach.get(credit.referring_coach_id) ?? { ids: [], total: 0 };
    entry.ids.push(credit.id);
    entry.total += credit.amount;
    creditsByCoach.set(credit.referring_coach_id, entry);
  }

  const dueCoachIds = Array.from(creditsByCoach.entries())
    .filter(([, entry]) => entry.total >= REFERRAL_PAYOUT_THRESHOLD_NGN)
    .map(([coachId]) => coachId);

  if (dueCoachIds.length > 0) {
    const { data: refCoaches } = await admin
      .from("coaches")
      .select("id, paystack_recipient_code")
      .in("id", dueCoachIds);
    const refRecipientMap = new Map(
      (refCoaches ?? []).map((c) => [c.id, c.paystack_recipient_code])
    );

    for (const coachId of dueCoachIds) {
      const recipientCode = refRecipientMap.get(coachId);
      if (!recipientCode) continue; // no payout destination yet — credits stay released
      const entry = creditsByCoach.get(coachId)!;
      try {
        await createTransfer({
          amount_kobo: Math.round(entry.total * 100),
          recipient_code: recipientCode,
          reference: `refcred-${coachId}-${Date.now()}`,
          reason: "LOBB referral earnings payout",
        });
        await admin
          .from("referral_credits")
          .update({ status: "paid_out", paid_out_at: new Date().toISOString() })
          .in("id", entry.ids);
        referralPaid += entry.ids.length;
      } catch {
        referralFailed += entry.ids.length;
      }
    }
  }

  return NextResponse.json({ released, dbFailed, transferred, transferFailed, referralPaid, referralFailed });
}
