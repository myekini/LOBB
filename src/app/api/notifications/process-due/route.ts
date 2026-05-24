import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

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

  const { data: jobs, error } = await admin
    .from("email_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.allSettled(
    (jobs ?? []).map(async (job) => {
      try {
        const result = await sendEmail({
          to: job.recipient_email,
          subject: job.subject,
          preview: job.preview,
          html: job.html,
          text: job.text,
        });
        await admin
          .from("email_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_message_id: result?.id ?? null,
            error_message: null,
          })
          .eq("id", job.id);
        return { id: job.id, status: "sent" };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Email failed";
        await admin
          .from("email_jobs")
          .update({ status: "failed", failed_at: new Date().toISOString(), error_message: message })
          .eq("id", job.id);
        return { id: job.id, status: "failed", error: message };
      }
    })
  );

  return NextResponse.json({
    processed: results.length,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { status: "failed" })),
  });
}
