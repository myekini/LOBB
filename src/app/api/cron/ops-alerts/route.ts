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

type Alert = {
  title: string;
  detail: string;
  link?: string;
  severity: "critical" | "warning";
};

function buildAlertEmail(alerts: Alert[]): { subject: string; html: string; text: string } {
  const critical = alerts.filter((a) => a.severity === "critical");
  const warning = alerts.filter((a) => a.severity === "warning");
  const subject = `[LOBB OPS] ${critical.length > 0 ? `${critical.length} critical` : ""}${critical.length > 0 && warning.length > 0 ? " · " : ""}${warning.length > 0 ? `${warning.length} warning` : ""} alert${alerts.length === 1 ? "" : "s"}`;

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://lobb.ng";

  const renderRows = (items: Alert[], color: string) =>
    items
      .map(
        (a) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e3df;vertical-align:top;">
          <p style="margin:0;font:700 14px/1.4 Arial,sans-serif;color:#0d0d0d;">${a.title}</p>
          <p style="margin:4px 0 0;font:400 13px/1.5 Arial,sans-serif;color:#6b6b6b;">${a.detail}</p>
          ${a.link ? `<a href="${a.link}" style="display:inline-block;margin-top:6px;font:700 12px/1 Arial,sans-serif;color:${color};">View →</a>` : ""}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e3df;width:90px;vertical-align:top;">
          <span style="display:inline-block;padding:3px 8px;border-radius:4px;font:700 11px/1.4 Arial,sans-serif;background:${color}1a;color:${color};">${a.severity.toUpperCase()}</span>
        </td>
      </tr>`
      )
      .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f2f1ef;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ef;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#fafafa;border:1px solid #e5e3df;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:24px 24px 16px;border-bottom:1px solid #e5e3df;">
    <p style="margin:0;font:700 18px/1.2 Arial,sans-serif;color:#0d0d0d;">LOBB Ops Alert</p>
    <p style="margin:4px 0 0;font:400 13px/1.5 Arial,sans-serif;color:#8a8a8a;">${new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} · Lagos</p>
  </td></tr>
  ${critical.length > 0 ? `
  <tr><td style="padding:16px 24px 8px;">
    <p style="margin:0;font:700 11px/1 Arial,sans-serif;color:#ba1a1a;text-transform:uppercase;letter-spacing:0.1em;">Critical (${critical.length})</p>
  </td></tr>
  <tr><td><table width="100%" cellpadding="0" cellspacing="0">${renderRows(critical, "#ba1a1a")}</table></td></tr>` : ""}
  ${warning.length > 0 ? `
  <tr><td style="padding:16px 24px 8px;">
    <p style="margin:0;font:700 11px/1 Arial,sans-serif;color:#c4622d;text-transform:uppercase;letter-spacing:0.1em;">Warning (${warning.length})</p>
  </td></tr>
  <tr><td><table width="100%" cellpadding="0" cellspacing="0">${renderRows(warning, "#c4622d")}</table></td></tr>` : ""}
  <tr><td style="padding:20px 24px;text-align:center;">
    <a href="${appBase}/admin" style="display:inline-block;padding:12px 28px;background:#0d0d0d;color:#ffffff;font:700 13px/1 Arial,sans-serif;text-decoration:none;border-radius:8px;">Open admin dashboard</a>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [subject, "", ...alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.detail}${a.link ? ` — ${a.link}` : ""}`)].join("\n");

  return { subject, html, text };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const alerts: Alert[] = [];
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "https://lobb.ng";

  // ── Check 1: Failed coach transfers ──────────────────────────────────────────
  // Completed bookings where escrow was released but Paystack transfer failed.
  const { data: failedTransfers } = await admin
    .from("bookings")
    .select("id, human_ref, transfer_last_error, coach_payout_ngn, coach_id")
    .eq("status", "completed")
    .not("escrow_released_at", "is", null)
    .is("paystack_transfer_code", null)
    .not("transfer_last_error", "is", null)
    .order("escrow_released_at", { ascending: false })
    .limit(20);

  if (failedTransfers && failedTransfers.length > 0) {
    const refs = failedTransfers
      .map((b) => b.human_ref ?? b.id.slice(0, 8))
      .slice(0, 5)
      .join(", ");
    alerts.push({
      title: `${failedTransfers.length} coach payout${failedTransfers.length === 1 ? "" : "s"} failed`,
      detail: `Booking${failedTransfers.length === 1 ? "" : "s"}: ${refs}${failedTransfers.length > 5 ? ` +${failedTransfers.length - 5} more` : ""}. Last error: ${String(failedTransfers[0].transfer_last_error).slice(0, 120)}`,
      link: `${appBase}/admin/payouts`,
      severity: "critical",
    });
  }

  // ── Check 2: Confirmed bookings whose session ended 3+ hours ago ─────────────
  // These should have been picked up by release-escrow cron. If they're still
  // confirmed it means the cron failed or the escrow release errored.
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data: stuckConfirmed } = await admin
    .from("bookings")
    .select("id, human_ref, ends_at")
    .eq("status", "confirmed")
    .lte("ends_at", threeHoursAgo)
    .is("escrow_released_at", null)
    .order("ends_at", { ascending: true })
    .limit(20);

  if (stuckConfirmed && stuckConfirmed.length > 0) {
    const oldest = stuckConfirmed[0];
    const hoursAgo = Math.round((Date.now() - new Date(oldest.ends_at as string).getTime()) / 3600000);
    alerts.push({
      title: `${stuckConfirmed.length} session${stuckConfirmed.length === 1 ? "" : "s"} stuck in confirmed`,
      detail: `Session${stuckConfirmed.length === 1 ? "" : "s"} ended but escrow not released. Oldest: ${oldest.human_ref ?? oldest.id.slice(0, 8)} ended ${hoursAgo}h ago. release-escrow cron may have failed.`,
      link: `${appBase}/admin/bookings`,
      severity: "critical",
    });
  }

  // ── Check 3: Payments stuck in pending > 30 min ───────────────────────────────
  // expire-pending-bookings cron handles cancellation at 20 min. Finding any here
  // means that cron itself is broken or a new booking slipped through.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stuckPending } = await admin
    .from("bookings")
    .select("id, human_ref, created_at, payments(status)")
    .in("status", ["pending", "pending_payment"])
    .lt("created_at", thirtyMinAgo)
    .limit(20);

  const genuinelyStuck = (stuckPending ?? []).filter((b) => {
    const pmts = b.payments as { status: string }[] | null;
    return !pmts?.some((p) => p.status === "paid");
  });

  if (genuinelyStuck.length > 0) {
    alerts.push({
      title: `${genuinelyStuck.length} payment${genuinelyStuck.length === 1 ? "" : "s"} stuck > 30 min`,
      detail: `Bookings in pending_payment for over 30 minutes with no paid payment. expire-pending-bookings cron may be failing.`,
      link: `${appBase}/admin/bookings`,
      severity: "warning",
    });
  }

  // No alerts — nothing to send
  if (alerts.length === 0) {
    return NextResponse.json({ alerts: 0, ok: true });
  }

  // Send alert email to all admins
  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("email, email_notifications_enabled")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (adminProfiles ?? []).filter(
    (p) => p.email && p.email_notifications_enabled !== false
  );

  const { subject, html, text } = buildAlertEmail(alerts);

  const results = await Promise.allSettled(
    recipients.map((p) =>
      sendEmail({ to: p.email, subject, html, text })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({
    alerts: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    emails_sent: sent,
    recipients: recipients.length,
  });
}
