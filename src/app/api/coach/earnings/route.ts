import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole(["coach", "admin"], async (_request, auth) => {
  const coachId = auth.user.id;

  const [summaryResult, payoutsResult, coachResult] = await Promise.all([
    auth.admin.from("coach_earnings_summary").select("*").eq("coach_id", coachId).maybeSingle(),
    auth.admin
      .from("payouts")
      .select("id, amount_ngn, session_count, status, processed_at, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(12),
    auth.admin
      .from("coaches")
      .select("bank_name, bank_account_number, bank_code, paystack_subaccount_code")
      .eq("id", coachId)
      .maybeSingle(),
  ]);

  if (summaryResult.error) return internalError(summaryResult.error);
  if (payoutsResult.error) return internalError(payoutsResult.error);
  if (coachResult.error) return internalError(coachResult.error);

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
    payouts: payoutsResult.data ?? [],
    bank: coachResult.data ?? null,
  });
});
