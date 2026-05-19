import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpSms } from "@/lib/sms";
import { adminPendingDigestMessage } from "@/lib/notification-messages";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-admin-secret") === secret;
}

export async function POST(request: Request) {
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

  // Find all admin phone numbers
  const { data: admins } = await admin
    .from("profiles")
    .select("phone_number")
    .eq("role", "admin")
    .not("phone_number", "is", null);

  if (!admins || admins.length === 0) {
    return NextResponse.json({ sent: false, reason: "no admin phone numbers configured" });
  }

  const message = adminPendingDigestMessage(pendingCount);

  const results = await Promise.allSettled(
    admins.map((a) => sendOtpSms({ phone: a.phone_number!, message }))
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ sent, pending_count: pendingCount });
}
