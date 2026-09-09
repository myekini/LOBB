import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";

// Server-side presence check only — never returns the encrypted values
// themselves. Replaces the previous pattern of selecting nin/bvn columns
// straight from the browser just to compute Boolean(value).
export const GET = withRole("coach", async (_request, auth) => {
  const { data: coach, error } = await auth.admin
    .from("coaches")
    .select(
      "kyc_status, kyc_nin_verified, kyc_bvn_verified, kyc_failed_reason, nin_encrypted, bvn_encrypted, bank_account_number, bank_name, dva_account_number, dva_bank_name",
    )
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!coach) return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });

  return NextResponse.json({
    kyc_status: coach.kyc_status,
    kyc_nin_verified: coach.kyc_nin_verified,
    kyc_bvn_verified: coach.kyc_bvn_verified,
    kyc_failed_reason: coach.kyc_failed_reason,
    has_nin: Boolean(coach.nin_encrypted),
    has_bvn: Boolean(coach.bvn_encrypted),
    bank_name: coach.bank_name,
    bank_account_number: coach.bank_account_number,
    dva_account_number: coach.dva_account_number,
    dva_bank_name: coach.dva_bank_name,
  });
});
