import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOtpSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: jobs, error } = await admin
    .from("sms_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.allSettled(
    (jobs ?? []).map(async (job) => {
      try {
        await sendOtpSms({ phone: job.recipient_phone, message: job.message });
        await admin
          .from("sms_jobs")
          .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
          .eq("id", job.id);
        return { id: job.id, status: "sent" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "SMS failed";
        await admin
          .from("sms_jobs")
          .update({ status: "failed", failed_at: new Date().toISOString(), error_message: message })
          .eq("id", job.id);
        return { id: job.id, status: "failed", error: message };
      }
    })
  );

  return NextResponse.json({
    processed: results.length,
    results: results.map((result) => (result.status === "fulfilled" ? result.value : { status: "failed" })),
  });
}
