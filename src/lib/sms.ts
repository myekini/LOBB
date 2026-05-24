type SendSmsInput = {
  phone: string;
  message: string;
};

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

async function sendSms({ phone, message }: SendSmsInput) {
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

// Twilio error 21608 — trial account cannot message unverified numbers.
// In test mode we suppress silently (the dev OTP hint flow still works).
function handleTrialError(error: unknown): boolean {
  return error instanceof TwilioError && error.code === 21608;
}

export async function sendOtpSms(input: SendSmsInput) {
  const useWhatsApp = Boolean(process.env.TWILIO_WHATSAPP_FROM);

  if (useWhatsApp) {
    try {
      return await sendWhatsApp(input);
    } catch (error) {
      if (handleTrialError(error)) {
        if (process.env.LOBB_ENABLE_TEST_OTP === "true") {
          console.warn("[sms] Twilio trial 21608 — unverified number suppressed in test mode");
          return;
        }
        throw new Error(
          "Twilio trial account cannot message unverified numbers. Verify the number in the Twilio console or upgrade to a paid account."
        );
      }
      // Fall through to regular SMS if WhatsApp fails for other reasons
      if (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID) {
        return sendSms(input);
      }
      throw error;
    }
  }

  try {
    return await sendSms(input);
  } catch (error) {
    if (handleTrialError(error)) {
      if (process.env.LOBB_ENABLE_TEST_OTP === "true") {
        console.warn("[sms] Twilio trial 21608 — unverified number suppressed in test mode");
        return;
      }
      throw new Error(
        "Twilio trial account cannot message unverified numbers. Verify the number or upgrade your account."
      );
    }
    throw error;
  }
}
