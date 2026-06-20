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

function money(ngn: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(ngn);
}

function stat(label: string, value: string, color = "#0d0d0d") {
  return `<td style="padding:16px;text-align:center;border-right:1px solid #e5e3df;">
    <p style="margin:0;font:700 24px/1 Arial,sans-serif;color:${color};">${value}</p>
    <p style="margin:6px 0 0;font:400 11px/1.3 Arial,sans-serif;color:#8a8a8a;text-transform:uppercase;letter-spacing:0.08em;">${label}</p>
  </td>`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://lobb.ng";

  // Run all queries in parallel
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [
    { count: pendingCoaches },
    { count: todayBookings },
    { data: todayRevenue },
    { count: failedTransfers },
    { count: stuckSessions },
    { data: adminProfiles },
  ] = await Promise.all([
    admin.from("coaches").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
    admin.from("bookings").select("hourly_rate_ngn").eq("status", "completed").gte("escrow_released_at", todayIso),
    admin.from("bookings").select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .not("escrow_released_at", "is", null)
      .is("paystack_transfer_code", null)
      .not("transfer_last_error", "is", null),
    admin.from("bookings").select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .lte("ends_at", new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())
      .is("escrow_released_at", null),
    admin.from("profiles").select("id, email, email_notifications_enabled").eq("role", "admin").not("email", "is", null),
  ]);

  const recipients = (adminProfiles ?? []).filter(
    (p) => p.email && p.email_notifications_enabled !== false
  );

  if (!recipients.length) {
    return NextResponse.json({ sent: false, reason: "no admin emails configured" });
  }

  const dailyGmv = (todayRevenue ?? []).reduce((sum, b) => sum + (b.hourly_rate_ngn ?? 0), 0);
  const hasAlerts = (failedTransfers ?? 0) > 0 || (stuckSessions ?? 0) > 0;

  const subject = `LOBB daily summary${hasAlerts ? " ⚠️ action needed" : ""} — ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}`;

  const alertBlock = hasAlerts
    ? `<tr><td style="padding:16px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border:1px solid #f4c4b0;border-radius:6px;">
          <tr><td style="padding:14px 16px;">
            <p style="margin:0;font:700 13px/1 Arial,sans-serif;color:#c4622d;text-transform:uppercase;letter-spacing:0.08em;">Action needed</p>
            ${(failedTransfers ?? 0) > 0 ? `<p style="margin:8px 0 0;font:400 13px/1.5 Arial,sans-serif;color:#42392f;"><strong>${failedTransfers} failed payout${(failedTransfers ?? 0) === 1 ? "" : "s"}</strong> — coach transfers completed but Paystack transfer failed. <a href="${appBase}/admin/payouts" style="color:#c4622d;">Review →</a></p>` : ""}
            ${(stuckSessions ?? 0) > 0 ? `<p style="margin:8px 0 0;font:400 13px/1.5 Arial,sans-serif;color:#42392f;"><strong>${stuckSessions} stuck session${(stuckSessions ?? 0) === 1 ? "" : "s"}</strong> — confirmed bookings whose session ended 3+ hours ago without escrow release. <a href="${appBase}/admin/bookings" style="color:#c4622d;">Review →</a></p>` : ""}
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f2f1ef;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ef;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fafafa;border:1px solid #e5e3df;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:24px 24px 16px;border-bottom:1px solid #e5e3df;background:#0d0d0d;">
    <p style="margin:0;font:700 18px/1.2 Arial,sans-serif;color:#ffffff;">LOBB Daily Summary</p>
    <p style="margin:4px 0 0;font:400 13px/1.5 Arial,sans-serif;color:rgba(255,255,255,0.55);">${new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" })}</p>
  </td></tr>
  <tr><td style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e3df;">
      <tr>
        ${stat("Bookings today", String(todayBookings ?? 0))}
        ${stat("GMV today", dailyGmv > 0 ? money(dailyGmv) : "—")}
        ${stat("Pending coaches", String(pendingCoaches ?? 0), (pendingCoaches ?? 0) > 0 ? "#c4622d" : "#0d0d0d")}
      </tr>
    </table>
  </td></tr>
  ${alertBlock}
  <tr><td style="padding:20px 24px;text-align:center;border-top:1px solid #e5e3df;">
    <a href="${appBase}/admin" style="display:inline-block;padding:12px 28px;background:#0d0d0d;color:#ffffff;font:700 13px/1 Arial,sans-serif;text-decoration:none;border-radius:8px;">Open admin dashboard</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    subject,
    "",
    `Bookings today: ${todayBookings ?? 0}`,
    `GMV today: ${dailyGmv > 0 ? money(dailyGmv) : "—"}`,
    `Pending coach approvals: ${pendingCoaches ?? 0}`,
    ...(hasAlerts
      ? [
          "",
          "ACTION NEEDED:",
          ...(( failedTransfers ?? 0) > 0 ? [`- ${failedTransfers} failed coach payout(s) — ${appBase}/admin/payouts`] : []),
          ...((stuckSessions ?? 0) > 0 ? [`- ${stuckSessions} stuck confirmed booking(s) — ${appBase}/admin/bookings`] : []),
        ]
      : []),
    "",
    `Admin dashboard: ${appBase}/admin`,
  ].join("\n");

  const results = await Promise.allSettled(
    recipients.map((p) =>
      sendEmail({ to: p.email, subject, html, text })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({
    sent,
    pending_coaches: pendingCoaches ?? 0,
    today_bookings: todayBookings ?? 0,
    today_gmv_ngn: dailyGmv,
    failed_transfers: failedTransfers ?? 0,
    stuck_sessions: stuckSessions ?? 0,
  });
}
