import { sendTermiiSms } from "@/lib/termii";

type SendSmsInput = {
  phone: string;
  message: string;
};

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured");
  }

  return { accountSid, authToken };
}

function normalizeWhatsAppAddress(phone: string) {
  if (phone.startsWith("whatsapp:")) {
    return phone;
  }

  return `whatsapp:${phone}`;
}

async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  body: URLSearchParams
) {
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
    throw new Error(payload?.message || "Twilio failed to send message");
  }

  return payload;
}

async function sendTwilioSms({ phone, message }: SendSmsInput) {
  const { accountSid, authToken } = getTwilioConfig();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!messagingServiceSid && !from) {
    throw new Error("Twilio is not configured");
  }

  const body = new URLSearchParams({
    To: phone,
    Body: message,
  });

  if (messagingServiceSid) {
    body.set("MessagingServiceSid", messagingServiceSid);
  } else if (from) {
    body.set("From", from);
  }

  return sendTwilioMessage(accountSid, authToken, body);
}

async function sendTwilioWhatsApp({ phone, message }: SendSmsInput) {
  const { accountSid, authToken } = getTwilioConfig();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;

  if (!from) {
    throw new Error("Twilio WhatsApp is not configured");
  }

  const body = new URLSearchParams({
    To: normalizeWhatsAppAddress(phone),
    From: normalizeWhatsAppAddress(from),
  });

  if (contentSid) {
    body.set("ContentSid", contentSid);
    body.set(
      "ContentVariables",
      JSON.stringify({
        1: message,
      })
    );
  } else {
    body.set("Body", message);
  }

  return sendTwilioMessage(accountSid, authToken, body);
}

export async function sendOtpSms(input: SendSmsInput) {
  const provider = process.env.SMS_PROVIDER || "termii";

  if (provider === "termii") {
    return sendTermiiSms(input);
  }

  if (provider === "twilio_whatsapp") {
    try {
      return await sendTwilioWhatsApp(input);
    } catch (error) {
      if (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID) {
        return sendTwilioSms(input);
      }

      if (process.env.TERMII_API_KEY) {
        return sendTermiiSms(input);
      }

      throw error;
    }
  }

  try {
    return await sendTwilioSms(input);
  } catch (error) {
    if (process.env.TERMII_API_KEY) {
      return sendTermiiSms(input);
    }

    throw error;
  }
}
