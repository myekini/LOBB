export type EmailTemplate = {
  subject: string;
  preview: string;
  html: string;
  text: string;
};

export type EmailBookingInfo = {
  bookingId: string;
  humanRef?: string | null;
  coachName: string;
  playerName: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  playerNotes: string | null;
  reference?: string;
  coachPhone?: string | null;
  playerPhone?: string | null;
  paidAt?: string | null;
  sessionFeeNgn?: number;
  convenienceFeeNgn?: number;
  totalAmountNgn?: number;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
};

export function emailEscapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailAppUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng";
  return `${base.replace(/\/$/, "")}${path}`;
}

const escapeHtml = emailEscapeHtml;
const appUrl = emailAppUrl;

function emailAssetUrl(path: string) {
  const configuredBase = process.env.NEXT_PUBLIC_EMAIL_ASSET_URL || process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng";
  const base = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredBase)
    ? "https://lobb.ng"
    : configuredBase;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
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
  {
    label: "Instagram",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/lobb.ng",
  },
  {
    label: "X / Twitter",
    href: process.env.NEXT_PUBLIC_X_URL || "https://x.com/lobb_ng",
  },
  {
    label: "lobb.ng",
    href: emailAppUrl("/"),
  },
];

export function emailShell(title: string, preview: string, body: string, cta?: { label: string; href: string }) {
  const logoUrl = emailAssetUrl("/email/lobb-logo.png");
  const ctaHtml = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;border-collapse:collapse;">
        <tr>
          <td style="border-radius:10px;background:${BRAND.ink};">
            <a href="${emailEscapeHtml(cta.href)}" style="display:inline-block;color:#ffffff;font:800 13px Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 24px;">${emailEscapeHtml(cta.label)}</a>
          </td>
        </tr>
      </table>`
    : "";
  const socialHtml = SOCIAL_LINKS.map(
    (item) => `<a href="${emailEscapeHtml(item.href)}" style="color:${BRAND.muted};font:700 12px Arial,Helvetica,sans-serif;text-decoration:none;">${emailEscapeHtml(item.label)}</a>`
  ).join(`<span style="color:${BRAND.faint};font:700 12px Arial,Helvetica,sans-serif;"> &nbsp;/&nbsp; </span>`);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:${BRAND.bg};padding:0;color:${BRAND.ink};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${emailEscapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border-collapse:collapse;">
            <tr>
              <td style="background:${BRAND.ink};padding:30px 30px 28px;border-radius:14px 14px 0 0;">
                <img src="${logoUrl}" width="190" height="55" alt="LOBB - Book a coach. Not a favor." style="display:block;width:190px;max-width:100%;height:auto;border:0;" />
                <h1 style="margin:28px 0 0;color:#ffffff;font:900 28px/1.16 Arial,Helvetica,sans-serif;">${emailEscapeHtml(title)}</h1>
                <p style="margin:10px 0 0;color:#D6D0C8;font:700 14px/1.6 Arial,Helvetica,sans-serif;">${emailEscapeHtml(preview)}</p>
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.surface};border-right:1px solid ${BRAND.line};border-left:1px solid ${BRAND.line};padding:28px 30px 34px;">
                ${body}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.surface};border:1px solid ${BRAND.line};border-top:0;border-radius:0 0 14px 14px;padding:22px 30px 26px;">
                <p style="margin:0;color:${BRAND.muted};font:700 12px/1.7 Arial,Helvetica,sans-serif;">Book a coach. Not a favor.</p>
                <p style="margin:8px 0 0;color:${BRAND.muted};font:700 12px/1.7 Arial,Helvetica,sans-serif;">Questions? Reply to this email or reach us at <a href="mailto:support@lobb.ng" style="color:${BRAND.ink};text-decoration:none;font-weight:900;">support@lobb.ng</a>.</p>
                <p style="margin:14px 0 0;">${socialHtml}</p>
                <p style="margin:14px 0 0;color:${BRAND.faint};font:600 11px/1.6 Arial,Helvetica,sans-serif;">You are receiving this because email notifications are enabled on your LOBB account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const shell = emailShell;

function detailRows(rows: Array<[string, string | null | undefined]>) {
  return rows
    .filter(([, value]) => Boolean(value))
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:13px 14px 13px 0;color:${BRAND.muted};font:800 11px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;width:34%;">${escapeHtml(label)}</td>
          <td style="padding:13px 0;color:${BRAND.ink};font:900 14px/1.45 Arial,Helvetica,sans-serif;text-align:right;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
}

function detailTable(rows: Array<[string, string | null | undefined]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;border-top:1px solid ${BRAND.line};border-bottom:1px solid ${BRAND.line};">${detailRows(rows)}</table>`;
}

type AmountRowTone = "normal" | "strong" | "discount";

function amountRows(rows: Array<[string, number | null | undefined, AmountRowTone]>) {
  return rows
    .filter(([, value]) => typeof value === "number")
    .map(([label, value, tone]) => {
      const isStrong = tone === "strong";
      const isDiscount = tone === "discount";
      return `<tr>
          <td style="padding:${isStrong ? "16px" : "10px"} 0;border-top:${isStrong ? `1px solid ${BRAND.line}` : "0"};color:${isStrong ? BRAND.ink : BRAND.muted};font:${isStrong ? "900 16px" : "700 14px"} Arial,Helvetica,sans-serif;">${escapeHtml(label)}</td>
          <td style="padding:${isStrong ? "16px" : "10px"} 0;border-top:${isStrong ? `1px solid ${BRAND.line}` : "0"};color:${isDiscount ? BRAND.success : BRAND.ink};font:${isStrong ? "900 18px" : "800 14px"} Arial,Helvetica,sans-serif;text-align:right;">${isDiscount ? "-" : ""}${money(value ?? 0)}</td>
        </tr>`;
    })
    .join("");
}

function amountTable(rows: Array<[string, number | null | undefined, AmountRowTone]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;">${amountRows(rows)}</table>`;
}

function receiptUrl(info: EmailBookingInfo) {
  return appUrl(`/dashboard/bookings/${info.bookingId}/receipt`);
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
  const displayRef = info.humanRef ?? info.reference ?? info.bookingId;
  const html = shell(
    "Booking confirmed",
    preview,
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,Helvetica,sans-serif;">You're all set. Your tennis session with <strong>${escapeHtml(info.coachName)}</strong> is confirmed.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Date", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Duration", "60 minutes"],
      ["Booking ref", displayRef],
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
export function paymentReceiptEmail(info: EmailBookingInfo): EmailTemplate {
  const total = info.totalAmountNgn ?? 0;
  const subject = "Receipt for your LOBB session";
  const preview = `${money(total)} paid · ${info.coachName} · ${formatDate(info.startsAt)}`;
  const paidAt = info.paidAt ? formatDate(info.paidAt) : "Payment confirmed";
  const displayRef = info.humanRef ?? info.reference ?? info.bookingId;
  const html = shell(
    `Payment confirmed: ${money(total)}`,
    preview,
    `<div style="border-bottom:1px solid ${BRAND.line};padding-bottom:22px;">
      <p style="margin:0;color:${BRAND.muted};font:800 11px Arial,Helvetica,sans-serif;letter-spacing:0.16em;text-transform:uppercase;">Total paid</p>
      <p style="margin:6px 0 0;color:${BRAND.ink};font:900 44px/1 Arial,Helvetica,sans-serif;letter-spacing:-0.03em;">${money(total)}</p>
      <p style="margin:10px 0 0;color:${BRAND.muted};font:700 13px/1.6 Arial,Helvetica,sans-serif;">Your session is confirmed and your spot is held. See you on court.</p>
    </div>
    ${amountTable([
      ["Session fee", info.sessionFeeNgn, "normal"],
      ["LOBB service fee (5%)", info.convenienceFeeNgn, "normal"],
      ["Total charged", total, "strong"],
    ])}
    ${detailTable([
      ["Coach", info.coachName],
      ["Session", `${formatDate(info.startsAt)}${info.endsAt ? ` to ${formatTime(info.endsAt)}` : ""}`],
      ["Location", info.location],
      ["Paid", paidAt],
      ["Booking ref", displayRef],
    ])}
    ${noteCard("Protected payment", "LOBB holds payment securely and releases it to the coach after the session is completed.", "success")}`,
    { label: "View receipt", href: receiptUrl(info) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nTotal paid: ${money(total)}\nCoach: ${info.coachName}\nPlayer: ${info.playerName}\nSession: ${formatDate(info.startsAt)}\nLocation: ${info.location}\nReceipt: ${receiptUrl(info)}\nReference: ${info.reference ?? info.bookingId}`,
  };
}

export function paymentFailedEmail(info: EmailBookingInfo): EmailTemplate {
  const subject = "Your LOBB payment did not complete";
  const preview = `We could not confirm payment for your session with ${info.coachName}.`;
  const html = shell(
    "Payment not completed",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your court session is not confirmed yet because the payment did not complete.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Session", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Reference", info.reference],
    ])}
    ${noteCard("No confirmed charge", "If your bank shows a debit, Paystack usually reverses failed attempts automatically. Reply to this email with the reference if it remains unresolved.", "warning")}`,
    { label: "Book again", href: appUrl("/coaches") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nSession: ${formatDate(info.startsAt)}\nLocation: ${info.location}\nReference: ${info.reference ?? info.bookingId}`,
  };
}

export function refundIssuedEmail(info: EmailBookingInfo, refundAmountNgn: number, refundSummary: string): EmailTemplate {
  const subject = "Your LOBB refund has been started";
  const preview = `${money(refundAmountNgn)} refund started for your cancelled session.`;
  const html = shell(
    "Refund started",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">We have started the refund for your cancelled LOBB session.</p>
    ${amountTable([
      ["Refund amount", refundAmountNgn, "strong"],
    ])}
    ${detailTable([
      ["Coach", info.coachName],
      ["Session", formatDate(info.startsAt)],
      ["Reference", info.reference],
      ["Status", refundSummary],
    ])}`,
    { label: "View booking", href: appUrl(`/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nRefund: ${money(refundAmountNgn)}\n${refundSummary}\nReference: ${info.reference ?? info.bookingId}`,
  };
}

export function bookingRescheduledEmail(info: EmailBookingInfo, recipient: "player" | "coach", previousStartsAt: string): EmailTemplate {
  const subject = "Your LOBB session was rescheduled";
  const preview = `New time: ${formatDate(info.startsAt)}.`;
  const html = shell(
    "Session rescheduled",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">This LOBB session has a new time. The latest schedule is below.</p>
    ${detailTable([
      ["Previous time", formatDate(previousStartsAt)],
      ["New time", `${formatDate(info.startsAt)}${info.endsAt ? ` - ${formatTime(info.endsAt)}` : ""}`],
      ["Coach", info.coachName],
      ["Player", info.playerName],
      ["Location", info.location],
      ["Reference", info.reference],
    ])}
    ${noteCard("Calendar check", "Please use the new time for arrival, court logistics, and reminders.", "warning")}`,
    { label: "View booking", href: appUrl(recipient === "coach" ? `/coach/bookings/${info.bookingId}` : `/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nPrevious: ${formatDate(previousStartsAt)}\nNew: ${formatDate(info.startsAt)}\nReference: ${info.reference ?? info.bookingId}`,
  };
}

export function waitlistUpdateEmail(info: EmailBookingInfo, availableUntil?: string | null): EmailTemplate {
  const subject = "A LOBB session slot opened up";
  const preview = `A spot with ${info.coachName} is available for ${formatDate(info.startsAt)}.`;
  const html = shell(
    "Slot available",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">A waitlisted tennis slot is now available. Book it while it is still open.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Session", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Held until", availableUntil ? formatDate(availableUntil) : null],
    ])}`,
    { label: "Book slot", href: appUrl("/coaches") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nCoach: ${info.coachName}\nSession: ${formatDate(info.startsAt)}\nLocation: ${info.location}`,
  };
}

export function trialConfirmedEmail(info: EmailBookingInfo): EmailTemplate {
  const subject = "Your LOBB trial session is confirmed";
  const preview = `Trial session with ${info.coachName}: ${formatDate(info.startsAt)}.`;
  const html = shell(
    "Trial confirmed",
    preview,
    `<p style="margin:0;color:${BRAND.muted};font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your trial session is confirmed. Come ready to share your goals so the coach can tailor the first hit.</p>
    ${detailTable([
      ["Coach", info.coachName],
      ["Player", info.playerName],
      ["Session", formatDate(info.startsAt)],
      ["Location", info.location],
      ["Reference", info.reference],
    ])}
    ${noteCard("First session tip", "Arrive a few minutes early with water, comfortable shoes, and anything you want the coach to know.", "success")}`,
    { label: "View booking", href: appUrl(`/dashboard/bookings/${info.bookingId}`) }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nCoach: ${info.coachName}\nSession: ${formatDate(info.startsAt)}\nLocation: ${info.location}`,
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
      ["Booking ref", info.humanRef ?? info.reference],
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,Helvetica,sans-serif;">Your feedback helps keep LOBB coach quality high and gives other players better signal.</p>
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
    `<p style="margin:0;color:#42392f;font:700 16px/1.7 Arial,Helvetica,sans-serif;">There ${pendingCount === 1 ? "is" : "are"} <strong>${pendingCount}</strong> coach profile${pendingCount === 1 ? "" : "s"} waiting for admin review.</p>`,
    { label: "Review coaches", href: appUrl("/admin/coaches") }
  );

  return {
    subject,
    preview,
    html,
    text: `${subject}\nReview: ${appUrl("/admin/coaches")}`,
  };
}
