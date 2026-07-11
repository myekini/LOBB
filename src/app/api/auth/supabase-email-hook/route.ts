import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { emailShell } from "@/lib/email-templates";

// ─── StandardWebhooks HMAC verification ───────────────────────────────────────
// Spec: https://www.standardwebhooks.com/
// Supabase issues the secret as "v1,whsec_<base64>" from the Auth → Hooks dashboard.

function verifySignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.SUPABASE_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("SUPABASE_EMAIL_HOOK_SECRET is not set");
    return false;
  }

  const msgId = headers.get("webhook-id");
  const msgTimestamp = headers.get("webhook-timestamp");
  const msgSignatures = headers.get("webhook-signature");

  if (!msgId || !msgTimestamp || !msgSignatures) return false;

  // Reject payloads older than 5 minutes
  const ageSecs = Math.abs(Math.floor(Date.now() / 1000) - parseInt(msgTimestamp, 10));
  if (ageSecs > 300) return false;

  // Strip the "v1,whsec_" prefix Supabase prepends and decode the raw key bytes
  const base64Secret = secret.replace(/^v1,whsec_/, "");
  const secretBytes = Buffer.from(base64Secret, "base64");

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const computed = `v1,${createHmac("sha256", secretBytes).update(signedContent).digest("base64")}`;

  // Signature header may contain multiple space-separated sigs (key rotation)
  return msgSignatures.split(" ").some((sig) => sig === computed);
}

// ─── Email templates ───────────────────────────────────────────────────────────

function otpHtml(code: string, isSignup: boolean) {
  return emailShell(
    isSignup ? "Confirm your email" : "Your login code",
    `${code} — expires in 10 minutes`,
    `<p style="margin:0;color:#6B6560;font:700 15px/1.7 Arial,Helvetica,sans-serif;">
      ${isSignup
        ? "Enter this code to verify your email and complete your LOBB sign-up."
        : "Enter this code on LOBB to finish signing in."}
    </p>
    <div style="margin-top:22px;border:1px solid #E8E3DC;border-radius:14px;background:#FAF8F5;padding:24px;text-align:center;">
      <p style="margin:0;color:#1A1714;font:900 42px/1 Arial,Helvetica,sans-serif;letter-spacing:0.24em;font-variant-numeric:tabular-nums;">${code}</p>
    </div>
    <p style="margin:18px 0 0;color:#A09890;font:700 12px/1.7 Arial,Helvetica,sans-serif;">
      If you did not request this code, you can safely ignore this email. It expires in 10 minutes.
    </p>`
  );
}

function recoveryHtml(code: string) {
  return emailShell(
    "Access your account",
    `${code} — your LOBB recovery code`,
    `<p style="margin:0;color:#6B6560;font:700 15px/1.7 Arial,Helvetica,sans-serif;">
      Use this 6-digit code to regain access to your LOBB account.
    </p>
    <div style="margin-top:22px;border:1px solid #E8E3DC;border-radius:14px;background:#FAF8F5;padding:24px;text-align:center;">
      <p style="margin:0;color:#1A1714;font:900 42px/1 Arial,Helvetica,sans-serif;letter-spacing:0.24em;font-variant-numeric:tabular-nums;">${code}</p>
    </div>
    <p style="margin:18px 0 0;color:#A09890;font:700 12px/1.7 Arial,Helvetica,sans-serif;">
      If you did not request this, ignore this email. Your account is safe.
    </p>`
  );
}

// ─── Hook types ───────────────────────────────────────────────────────────────

type HookPayload = {
  user?: {
    id?: string;
    email?: string;
    new_email?: string;
  };
  email_data?: {
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
  };
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody) as HookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = payload.user?.email;
  const token = payload.email_data?.token;
  const actionType = payload.email_data?.email_action_type ?? "magiclink";

  // OTP-sending actions — everything else is a notification we don't handle yet
  const otpActions = ["signup", "magiclink", "email", "recovery", "email_change", "reauthentication"];

  if (!email || !token || !otpActions.includes(actionType)) {
    // Return 200 so Supabase doesn't retry — we simply don't send for these types.
    // Must be JSON: Supabase rejects hook responses without a JSON Content-Type
    // (error: hook_payload_invalid_content_type), which fails the whole signInWithOtp.
    return NextResponse.json({});
  }

  try {
    if (actionType === "recovery") {
      await sendEmail({
        to: email,
        subject: `${token} — your LOBB recovery code`,
        preview: `${token} — expires in 10 minutes`,
        html: recoveryHtml(token),
        text: `Your LOBB recovery code is: ${token}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\nLOBB`,
      });
    } else {
      const isSignup = actionType === "signup";
      await sendEmail({
        to: email,
        subject: `${token} is your LOBB ${isSignup ? "verification" : "login"} code`,
        preview: `${token} — expires in 10 minutes`,
        html: otpHtml(token, isSignup),
        text: `Your LOBB code is: ${token}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\nLOBB`,
      });
    }
  } catch (err) {
    console.error("Email hook send failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Email delivery failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({});
}
