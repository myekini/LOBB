import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminDigestEmail } from "@/lib/email-notifications";

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

  // Count pending coach approvals
  const { count, error: countError } = await admin
    .from("coaches")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const pendingCount = count ?? 0;
  if (pendingCount === 0) {
    return NextResponse.json({ sent: false, reason: "no pending approvals" });
  }

  // Find all admin email addresses
  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, email_notifications_enabled")
    .eq("role", "admin")
    .not("email", "is", null);

  if (!admins || admins.length === 0) {
    return NextResponse.json({ sent: false, reason: "no admin emails configured" });
  }

  const results = await Promise.allSettled(
    admins
      .filter((adminProfile) => adminProfile.email_notifications_enabled !== false)
      .map((adminProfile) => sendAdminDigestEmail(admin, adminProfile.id, adminProfile.email, pendingCount))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, pending_count: pendingCount });
}
