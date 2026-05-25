type SendSmsInput = {
  phone: string;
  message: string;
};

// ─── Termii ──────────────────────────────────────────────────────────────────

async function sendTermiiSms({ phone, message }: SendSmsInput) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error("TERMII_API_KEY is not configured");

  const senderId = process.env.TERMII_SENDER_ID || "LOBB";
  const channel = process.env.TERMII_CHANNEL || "generic"; // "generic" | "dnd" | "whatsapp"

  // Termii expects numbers without the + prefix
  const to = phone.replace(/^\+/, "");

  const response = await fetch("https://v3.api.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: senderId,
      sms: message,
      type: "plain",
      api_key: apiKey,
      channel,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.code === "ok" === false) {
    throw new Error(
      payload?.message || `Termii request failed (${response.status})`
    );
  }

  return payload;
}

// ─── Twilio (kept for WhatsApp notifications — not OTP) ───────────────────

class TwilioError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials are not configured");
  return { accountSid, authToken };
}

async function sendTwilioRequest(accountSid: string, authToken: string, body: URLSearchParams) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new TwilioError(payload?.message || "Twilio request failed", payload?.code ?? 0);
  }

  return payload;
}

async function sendWhatsApp({ phone, message }: SendSmsInput) {
  const { accountSid, authToken } = getTwilioConfig();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) throw new Error("TWILIO_WHATSAPP_FROM is not configured");

  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
  const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  const body = new URLSearchParams({ To: to, From: fromAddr });

  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (contentSid) {
    body.set("ContentSid", contentSid);
    body.set("ContentVariables", JSON.stringify({ 1: message }));
  } else {
    body.set("Body", message);
  }

  return sendTwilioRequest(accountSid, authToken, body);
}

async function sendTwilioSms({ phone, message }: SendSmsInput) {
  const { accountSid, authToken } = getTwilioConfig();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!messagingServiceSid && !from) throw new Error("Twilio SMS sender is not configured");

  const body = new URLSearchParams({ To: phone, Body: message });
  if (messagingServiceSid) {
    body.set("MessagingServiceSid", messagingServiceSid);
  } else {
    body.set("From", from!);
  }

  return sendTwilioRequest(accountSid, authToken, body);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an OTP SMS.
 * Uses Termii when TERMII_API_KEY is set (recommended for Nigeria).
 * Falls back to Twilio WhatsApp → Twilio SMS otherwise.
 */
export async function sendOtpSms(input: SendSmsInput) {
  // Termii is the preferred path for Nigeria OTP delivery
  if (process.env.TERMII_API_KEY) {
    return sendTermiiSms(input);
  }

  // Legacy Twilio path — kept for backward compatibility
  if (process.env.TWILIO_WHATSAPP_FROM) {
    try {
      return await sendWhatsApp(input);
    } catch (error) {
      // Fall through to regular SMS on any WhatsApp failure
      if (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID) {
        return sendTwilioSms(input);
      }
      throw error;
    }
  }

  return sendTwilioSms(input);
}

/**
 * Send a non-OTP notification (booking confirmations, reminders, etc.).
 * Tries WhatsApp first (better engagement), falls back to SMS.
 */
export async function sendNotificationSms(input: SendSmsInput) {
  // Termii WhatsApp channel (if configured)
  if (process.env.TERMII_API_KEY && process.env.TERMII_CHANNEL === "whatsapp") {
    return sendTermiiSms(input);
  }

  // Twilio WhatsApp for richer notification delivery
  if (process.env.TWILIO_WHATSAPP_FROM) {
    try {
      return await sendWhatsApp(input);
    } catch {
      // Fall through to SMS
    }
  }

  if (process.env.TERMII_API_KEY) {
    return sendTermiiSms(input);
  }

  return sendTwilioSms(input);
}
