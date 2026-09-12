import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

// Only the columns the approval UI renders. Never select("*") here — the coaches
// table holds bank account numbers and encrypted KYC (NIN/BVN) that must not
// reach the browser. Payout readiness is exposed as a boolean, not the raw code.
const APPROVAL_COLUMNS =
  "id, full_name, headline, bio, hourly_rate_ngn, primary_location, service_areas, certifications, demo_video_url, profile_photo_url, slug, created_at, paystack_recipient_code, kyc_status, kyc_nin_verified, kyc_bvn_verified";

export const GET = withRole("admin", async (_request, auth) => {
  const { data, error } = await auth.admin
    .from("coaches")
    .select(APPROVAL_COLUMNS)
    .eq("status", "pending_review")
    .order("created_at");

  if (error) return internalError(error);

  const coaches = (data ?? []).map(({ paystack_recipient_code, ...coach }) => ({
    ...coach,
    bank_connected: Boolean(paystack_recipient_code),
  }));

  return NextResponse.json({ coaches });
});
