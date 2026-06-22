import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole(["coach", "admin"], async (_request, auth) => {
  const coachId = auth.user.id;

  const [summaryResult, payoutsResult, coachResult, referralCreditsResult, referralSignupsResult] =
    await Promise.all([
      auth.admin.from("coach_earnings_summary").select("*").eq("coach_id", coachId).maybeSingle(),
      auth.admin
        .from("payouts")
        .select("id, amount_ngn, session_count, status, processed_at, created_at")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })
        .limit(12),
      auth.admin
        .from("coaches")
        .select("bank_name, bank_account_number, bank_code, paystack_subaccount_code, referral_code")
        .eq("id", coachId)
        .maybeSingle(),
      auth.admin
        .from("referral_credits")
        .select("id, amount, status, released_at, created_at")
        .eq("referring_coach_id", coachId)
        .order("created_at", { ascending: false }),
      auth.admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by_coach_id", coachId),
    ]);

  if (summaryResult.error) return internalError(summaryResult.error);
  if (payoutsResult.error) return internalError(payoutsResult.error);
  if (coachResult.error) return internalError(coachResult.error);

  const credits = referralCreditsResult.data ?? [];
  const signupsCount = referralSignupsResult.count ?? 0;
  const bookedCount = credits.length; // one credit per referred user who first-booked
  const totalReferralNgn = credits.reduce((s, c) => s + c.amount, 0);
  const releasedReferralNgn = credits
    .filter((c) => c.status === "released" || c.status === "paid_out")
    .reduce((s, c) => s + c.amount, 0);
  const paidOutReferralNgn = credits
    .filter((c) => c.status === "paid_out")
    .reduce((s, c) => s + c.amount, 0);

  const { referral_code, ...bank } = coachResult.data ?? {};

  return NextResponse.json({
    summary: summaryResult.data ?? {
      gross_this_week_ngn: 0,
      net_this_week_ngn: 0,
      gross_this_month_ngn: 0,
      net_this_month_ngn: 0,
      gross_all_time_ngn: 0,
      net_all_time_ngn: 0,
      pending_payout_ngn: 0,
    },
    referral: {
      referral_code: referral_code ?? null,
      signups_count: signupsCount,
      booked_count: bookedCount,
      total_ngn: totalReferralNgn,
      released_ngn: releasedReferralNgn,
      paid_out_ngn: paidOutReferralNgn,
      credits,
    },
    payouts: payoutsResult.data ?? [],
    bank: bank ?? null,
  });
});
