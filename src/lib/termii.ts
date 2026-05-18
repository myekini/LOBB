import { toTermiiPhoneNumber } from "@/lib/phone";

type SendTermiiSmsInput = {
  phone: string;
  message: string;
};

export async function sendTermiiSms({ phone, message }: SendTermiiSmsInput) {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "LOBB";

  if (!apiKey) {
    throw new Error("TERMII_API_KEY is not configured");
  }

  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      to: toTermiiPhoneNumber(phone),
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Termii failed to send SMS");
  }

  return payload;
}
