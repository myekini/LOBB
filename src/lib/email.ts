type SendEmailInput = {
  to: string | null | undefined;
  subject: string;
  preview?: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

type SendEmailResult = {
  id?: string;
};

const DEFAULT_FROM = "LOBB <bookings@notifications.lobb.ng>";

export function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult | null> {
  const to = normalizeEmail(input.to);
  if (!to) return null;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo || process.env.EMAIL_REPLY_TO || "support@lobb.ng",
      headers: input.preview ? { "X-Entity-Ref-ID": input.preview.slice(0, 128) } : undefined,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || "Resend failed to send email");
  }

  return { id: payload?.id };
}
