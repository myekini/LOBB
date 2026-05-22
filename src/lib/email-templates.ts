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

function shell(title: string, preview: string, body: string, cta?: { label: string; href: string }) {
  const ctaHtml = cta
    ? `<a href="${escapeHtml(cta.href)}" style="display:inline-block;margin-top:26px;border-radius:999px;background:#0f0e0c;color:#ffffff;font:800 14px Arial,sans-serif;text-decoration:none;padding:14px 22px;">${escapeHtml(cta.label)}</a>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f7f3ec;padding:28px 14px;color:#17130f;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preview)}</div>
    <main style="max-width:620px;margin:0 auto;background:#fffaf2;border:1px solid #eadfce;border-radius:22px;overflow:hidden;box-shadow:0 18px 48px rgba(44,32,18,0.08);">
      <header style="padding:28px 30px 20px;border-bottom:1px solid #eadfce;background:#ffffff;">
        <p style="margin:0 0 10px;color:#b85f32;font:900 12px Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;">LOBB</p>
        <h1 style="margin:0;color:#17130f;font:900 28px/1.1 Arial,sans-serif;letter-spacing:0;">${escapeHtml(title)}</h1>
      </header>
      <section style="padding:28px 30px 32px;">
        ${body}
        ${ctaHtml}
      </section>
      <footer style="padding:20px 30px;background:#17130f;color:#d8d0c3;">
        <p style="margin:0;font:700 13px/1.6 Arial,sans-serif;">LOBB connects Lagos players and coaches with secure booking, payment, and session updates.</p>
        <p style="margin:14px 0 0;font:600 12px/1.5 Arial,sans-serif;color:#a79d8e;">Need help? Reply to this email or contact support@lobb.ng.</p>
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
          <td style="padding:12px 0;color:#756b5d;font:800 12px Arial,sans-serif;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(label)}</td>
          <td style="padding:12px 0;color:#17130f;font:800 15px Arial,sans-serif;text-align:right;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
}

function detailTable(rows: Array<[string, string | null | undefined]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;border-top:1px solid #eadfce;border-bottom:1px solid #eadfce;">${detailRows(rows)}</table>`;
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;"><strong>${escapeHtml(info.playerName)}</strong> booked a session with you.</p>
    ${detailTable([
      ["Player", info.playerName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
      ["Player phone", info.playerPhone],
      ["Note", info.playerNotes],
      ["Reference", info.reference],
    ])}`,
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">A quick reminder for your upcoming LOBB session.</p>
    ${detailTable([
      [isCoach ? "Player" : "Coach", isCoach ? info.playerName : info.coachName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
    ])}`,
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">This session has been cancelled by ${escapeHtml(cancelledBy)}.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Player", info.playerName],
      ["Date", formatDate(info.startsAt)],
      ["Refund", refundSummary],
      ["Reference", info.reference],
    ])}`,
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
      ? `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">Your coach profile has been approved. Players can now find and book your sessions.</p>`
      : `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">Your profile needs a few updates before it can go live.</p>${detailTable([
          ["Reason", reason],
          ["Next step", needsDirectContact ? "Contact LOBB support directly" : "Edit and resubmit your profile"],
        ])}`,
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,sans-serif;">Your coach payout has been processed.</p>
    ${detailTable([
      ["Amount", money(amount)],
      ["Sessions", String(sessionCount)],
    ])}`,
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
