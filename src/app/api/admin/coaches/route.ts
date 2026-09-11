import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

// Admin coach directory — every coach, any status. Safe columns only: the
// coaches table also holds bank account numbers and encrypted KYC (NIN/BVN)
// that must never reach the browser. Payout readiness is a boolean, not the
// raw recipient code.
const DIRECTORY_COLUMNS =
  "id, full_name, headline, primary_location, hourly_rate_ngn, profile_photo_url, slug, status, is_verified, kyc_status, rejection_count, created_at, approved_at, suspended_at, paystack_recipient_code";

const STATUSES = ["draft", "pending_review", "active", "paused", "rejected", "suspended"] as const;

// MVP-scale cap — the page filters/searches the returned set client-side.
const LIMIT = 500;

export const GET = withRole("admin", async (request, auth) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const q = url.searchParams.get("q")?.trim();

  let query = auth.admin
    .from("coaches")
    .select(DIRECTORY_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status);
  }
  if (q) {
    const term = q.replace(/[%,]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,primary_location.ilike.%${term}%,headline.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return internalError(error);

  const coaches = (data ?? []).map(({ paystack_recipient_code, ...coach }) => ({
    ...coach,
    bank_connected: Boolean(paystack_recipient_code),
  }));

  return NextResponse.json({ coaches });
});
