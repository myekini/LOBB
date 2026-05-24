type EmailTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

export type EmailBookingInfo = {
  bookingId: string;
  coachName: string;
  playerName: string;
  startsAt: string;
  location: string;
  playerNotes: string | null;
  reference?: string;
  coachPhone?: string | null;
  playerPhone?: string | null;
};

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng";
  return `${base.replace(/\/$/, "")}${path}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

function money(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

const BRAND = {
  clay: "#C4622D",
  clayLight: "#F5E6DC",
  ink: "#1A1714",
  muted: "#6B6560",
  faint: "#A09890",
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  line: "#E8E3DC",
  success: "#2D6A4F",
};

const SOCIAL_LINKS = [
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/lobb.ng" },
  { label: "X", href: process.env.NEXT_PUBLIC_X_URL || "https://x.com/lobb_ng" },
  { label: "Website", href: appUrl("/") },
];

function shell(title: string, preview: string, body: string, cta?: { label: string; href: string }) {
  const ctaHtml = cta
    ? `<div style="margin-top:28px;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;border-radius:14px;background:${BRAND.ink};color:#ffffff;font:800 14px Arial,Helvetica,sans-serif;text-decoration:none;padding:15px 22px;box-shadow:0 10px 24px rgba(26,23,20,0.16);">${escapeHtml(cta.label)}</a></div>`
    : "";
  const socialHtml = SOCIAL_LINKS.map(
    (item) => `<a href="${escapeHtml(item.href)}" style="color:#F5E6DC;text-decoration:none;font:800 12px Arial,Helvetica,sans-serif;">${escapeHtml(item.label)}</a>`
  ).join(`<span style="color:#6B6560;">·</span>`);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:${BRAND.bg};padding:32px 14px;color:${BRAND.ink};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preview)}</div>
    <main style="max-width:640px;margin:0 auto;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:26px;overflow:hidden;box-shadow:0 18px 54px rgba(90,60,30,0.10);">
      <header style="padding:28px 30px 24px;border-bottom:1px solid ${BRAND.line};background:${BRAND.surface};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="width:34px;height:34px;border-radius:12px;background:${BRAND.ink};text-align:center;vertical-align:middle;">
                    <span style="display:inline-block;color:${BRAND.clay};font:900 15px Arial,Helvetica,sans-serif;line-height:34px;">L</span>
                  </td>
                  <td style="padding-left:10px;">
                    <p style="margin:0;color:${BRAND.ink};font:900 13px Arial,Helvetica,sans-serif;letter-spacing:0.18em;text-transform:uppercase;">LOBB</p>
                    <p style="margin:2px 0 0;color:${BRAND.faint};font:700 11px Arial,Helvetica,sans-serif;">Lagos tennis, booked cleanly</p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right">
              <span style="display:inline-block;border:1px solid ${BRAND.line};border-radius:999px;padding:7px 10px;color:${BRAND.clay};font:900 10px Arial,Helvetica,sans-serif;letter-spacing:0.14em;text-transform:uppercase;">Court update</span>
            </td>
          </tr>
        </table>
        <h1 style="margin:26px 0 0;color:${BRAND.ink};font:900 30px/1.08 Arial,Helvetica,sans-serif;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
        <p style="margin:10px 0 0;color:${BRAND.muted};font:700 14px/1.6 Arial,Helvetica,sans-serif;">${escapeHtml(preview)}</p>
      </header>
      <section style="padding:28px 30px 34px;">
        ${body}
        ${ctaHtml}
      </section>
      <footer style="padding:24px 30px;background:${BRAND.ink};color:#F5E6DC;">
        <p style="margin:0;color:#ffffff;font:900 14px Arial,Helvetica,sans-serif;letter-spacing:0.14em;text-transform:uppercase;">LOBB</p>
        <p style="margin:10px 0 0;font:700 13px/1.7 Arial,Helvetica,sans-serif;color:#D8D0C3;">Secure tennis booking, coach operations, payments, and session updates for Lagos courts.</p>
        <p style="margin:16px 0 0;">${socialHtml}</p>
        <p style="margin:16px 0 0;font:600 12px/1.6 Arial,Helvetica,sans-serif;color:#A09890;">Need help? Reply to this email or contact <a href="mailto:support@lobb.ng" style="color:#F5E6DC;text-decoration:none;font-weight:800;">support@lobb.ng</a>.</p>
        <p style="margin:12px 0 0;font:600 11px/1.6 Arial,Helvetica,sans-serif;color:#6B6560;">You are receiving this because email notifications are enabled on your LOBB account.</p>
      </footer>
    </main>
  </body>
</html>`;
}

function detailRows(rows: Array<[string, string | null | undefined]>) {
  return rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:13px 0;color:${BRAND.muted};font:800 11px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(label)}</td>
          <td style="padding:13px 0;color:${BRAND.ink};font:900 14px Arial,Helvetica,sans-serif;text-align:right;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
}

function detailTable(rows: Array<[string, string | null | undefined]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;border-top:1px solid ${BRAND.line};border-bottom:1px solid ${BRAND.line};">${detailRows(rows)}</table>`;
}

function noteCard(title: string, body: string, tone: "default" | "success" | "warning" = "default") {
  const colors = tone === "success"
    ? { bg: "#E8F4ED", border: "rgba(45,106,79,0.20)", title: BRAND.success }
    : tone === "warning"
    ? { bg: BRAND.clayLight, border: "rgba(196,98,45,0.30)", title: BRAND.clay }
    : { bg: BRAND.bg, border: BRAND.line, title: BRAND.ink };

  return `<div style="margin-top:22px;border:1px solid ${colors.border};border-radius:18px;background:${colors.bg};padding:16px 18px;">
    <p style="margin:0;color:${colors.title};font:900 13px Arial,Helvetica,sans-serif;">${escapeHtml(title)}</p>
    <p style="margin:6px 0 0;color:${BRAND.muted};font:700 13px/1.6 Arial,Helvetica,sans-serif;">${escapeHtml(body)}</p>
  </div>`;
}

export function bookingConfirmedPlayerEmail(info: EmailBookingInfo): EmailTemplate {
  const subject = `Your session with ${info.coachName} is confirmed`;
  const preview = `You are booked for ${formatDate(info.startsAt)}.`;
  const html = shell(
    "Booking confirmed",
    preview,
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">You're all set. Your tennis session with <strong>${escapeHtml(info.coachName)}</strong> is confirmed.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
      ["Reference", info.reference],
      ["Coach phone", info.coachPhone],
    ])}`,
    { label: "View booking", href: appUrl(`/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `Booking confirmed\nCoach: ${info.coachName}\nDate: ${formatDate(info.startsAt)}\nLocation: ${info.location}\nRef: ${info.reference ?? info.bookingId}`,
  };
}

export function bookingConfirmedCoachEmail(info: EmailBookingInfo): EmailTemplate {
  const subject = `New booking from ${info.playerName}`;
  const preview = `${info.playerName} booked ${formatDate(info.startsAt)}.`;
  const html = shell(
    "New booking",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;"><strong style="color:${BRAND.ink};">${escapeHtml(info.playerName)}</strong> booked a session with you. Review the session details and arrive with court logistics clear.</p>
    ${detailTable([
      ["Player", info.playerName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
      ["Player phone", info.playerPhone],
      ["Note", info.playerNotes],
      ["Reference", info.reference],
    ])}
    ${noteCard("Coach checklist", "Confirm the location, review the player note, and keep your availability current after the session.", "success")}`,
    { label: "Open coach booking", href: appUrl(`/coach/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `New booking\nPlayer: ${info.playerName}\nDate: ${formatDate(info.startsAt)}\nLocation: ${info.location}\nRef: ${info.reference ?? info.bookingId}`,
  };
}

export function bookingReminderEmail(info: EmailBookingInfo, recipient: "player" | "coach"): EmailTemplate {
  const isCoach = recipient === "coach";
  const title = "Session reminder";
  const subject = isCoach ? `Reminder: session with ${info.playerName}` : `Reminder: session with ${info.coachName}`;
  const preview = `Your session is scheduled for ${formatDate(info.startsAt)}.`;
  const html = shell(
    title,
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">A quick reminder for your upcoming LOBB session.</p>
    ${detailTable([
      [isCoach ? "Player" : "Coach", isCoach ? info.playerName : info.coachName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
    ])}
    ${isCoach ? noteCard("Before the session", "Check the player note, arrive early, and keep your phone available for coordination.", "warning") : ""}`,
    { label: isCoach ? "View booking" : "View booking", href: appUrl(isCoach ? `/coach/bookings/${info.bookingId}` : `/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nDate: ${formatDate(info.startsAt)}\nLocation: ${info.location}`,
  };
}

export function reviewRequestEmail(info: EmailBookingInfo): EmailTemplate {
  const subject = `How was your session with ${info.coachName}?`;
  const preview = "Share a quick rating to help other players choose well.";
  const html = shell(
    "Rate your session",
    preview,
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">Your feedback helps keep LOBB coach quality high and gives other players better signal.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Session", formatDate(info.startsAt)],
    ])}`,
    { label: "Leave a review", href: appUrl(`/dashboard/review/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nLeave a review: ${appUrl(`/dashboard/review/${info.bookingId}`)}`,
  };
}

export function bookingCancelledEmail(
  info: EmailBookingInfo,
  recipient: "player" | "coach",
  cancelledBy: "player" | "coach" | "admin",
  refundSummary: string
): EmailTemplate {
  const subject = recipient === "player" ? "Your LOBB session was cancelled" : "A LOBB booking was cancelled";
  const preview = refundSummary;
  const html = shell(
    "Booking cancelled",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">This session has been cancelled by <strong style="color:${BRAND.ink};">${escapeHtml(cancelledBy)}</strong>.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Player", info.playerName],
      ["Date", formatDate(info.startsAt)],
      ["Refund", refundSummary],
      ["Reference", info.reference],
    ])}
    ${recipient === "coach" ? noteCard("Schedule updated", "This slot is no longer booked. Review your availability if you want to reopen or block nearby times.", "warning") : ""}`,
    { label: recipient === "coach" ? "Open booking" : "View booking", href: appUrl(recipient === "coach" ? `/coach/bookings/${info.bookingId}` : `/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nDate: ${formatDate(info.startsAt)}\n${refundSummary}`,
  };
}

export function coachDecisionEmail(
  action: "approve" | "reject",
  reason: string | null,
  needsDirectContact: boolean
): EmailTemplate {
  const approved = action === "approve";
  const subject = approved ? "Your LOBB coach profile is live" : "Your LOBB coach profile needs updates";
  const preview = approved ? "Players can now discover and book you." : reason ?? "Review the requested updates and resubmit.";
  const html = shell(
    approved ? "You're live" : "Profile updates needed",
    preview,
    approved
      ? `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your coach profile has been approved. Players can now find and book your sessions.</p>${noteCard("Next step", "Set accurate availability so players can book times you can confidently deliver.", "success")}`
      : `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your profile needs a few updates before it can go live.</p>${detailTable([
          ["Reason", reason],
          ["Next step", needsDirectContact ? "Contact LOBB support directly" : "Edit and resubmit your profile"],
        ])}${noteCard("Review tip", needsDirectContact ? "Reply to this email and our team will help you resolve the profile review." : "Update only the requested items, then submit again from your coach profile.", "warning")}`,
    { label: approved ? "Set availability" : "Edit profile", href: appUrl(approved ? "/coach/availability" : "/coach/profile/edit") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\n${preview}`,
  };
}

export function payoutProcessedEmail(amount: number, sessionCount: number): EmailTemplate {
  const subject = "Your LOBB payout has been processed";
  const preview = `${money(amount)} sent for ${sessionCount} completed session${sessionCount === 1 ? "" : "s"}.`;
  const html = shell(
    "Payout processed",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your coach payout has been processed.</p>
    ${detailTable([
      ["Amount", money(amount)],
      ["Sessions", String(sessionCount)],
    ])}
    ${noteCard("Payout record", "You can review recent payouts and pending balances from your coach earnings page.", "success")}`,
    { label: "View earnings", href: appUrl("/coach/earnings") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nAmount: ${money(amount)}\nSessions: ${sessionCount}`,
  };
}

export function adminPendingDigestEmail(pendingCount: number): EmailTemplate {
  const subject = `${pendingCount} coach profile${pendingCount === 1 ? "" : "s"} pending review`;
  const preview = "Open the admin dashboard to approve or reject coach applications.";
  const html = shell(
    "Coach approvals pending",
    preview,
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">There ${pendingCount === 1 ? "is" : "are"} <strong>${pendingCount}</strong> coach profile${pendingCount === 1 ? "" : "s"} waiting for admin review.</p>`,
    { label: "Review coaches", href: appUrl("/admin/coaches") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nReview: ${appUrl("/admin/coaches")}`,
  };
}
