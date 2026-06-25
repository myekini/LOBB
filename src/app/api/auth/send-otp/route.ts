import { NextResponse } from "next/server";
import { createOtp } from "@/lib/db-otp";
import { sendEmail, normalizeEmail } from "@/lib/email";
import { emailShell } from "@/lib/email-templates";
import { createAdminClient } from "@/lib/supabase/admin";

function getRequestedRole(role: string | undefined) {
  if (role === "coach") return "coach";
  return "player";
}

function otpEmailHtml(code: string) {
  return emailShell(
    "Your login code",
    "Use this 6-digit code to sign in. It expires in 10 minutes.",
    `<p style="margin:0;color:#6B6560;font:700 15px/1.7 Arial,Helvetica,sans-serif;">Enter this code on LOBB to finish signing in.</p>
    <div style="margin-top:22px;border:1px solid #E8E3DC;border-radius:14px;background:#FAF8F5;padding:24px;text-align:center;">
      <p style="margin:0;color:#1A1714;font:900 42px/1 Arial,Helvetica,sans-serif;letter-spacing:0.24em;font-variant-numeric:tabular-nums;">${code}</p>
    </div>
    <p style="margin:18px 0 0;color:#A09890;font:700 12px/1.7 Arial,Helvetica,sans-serif;">If you did not request this code, you can safely ignore this email.</p>`
  );
}

function otpEmailText(code: string) {
  return `Your LOBB login code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\nLOBB`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; role?: string };
    const role = getRequestedRole(body.role);

    // ── Email OTP path (primary) ──────────────────────────────────────────────
    if (body.email) {
      const email = normalizeEmail(body.email);
      if (!email) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }

      // Login mode (no role in request) — verify account exists first.
      // Signup mode always has a role, so skip the check there.
      if (!body.role) {
        const admin = createAdminClient();
        const { data: existing } = await admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!existing) {
          return NextResponse.json(
            { error: "No account found with this email. Sign up first." },
            { status: 404 }
          );
        }
      }

      const otp = await createOtp(email, role);
      if ("error" in otp) {
        return NextResponse.json({ error: otp.error }, { status: 429 });
      }

      await sendEmail({
        to: email,
        subject: `${otp.code} is your LOBB login code`,
        preview: "Use this 6-digit code to sign in. It expires in 10 minutes.",
        html: otpEmailHtml(otp.code),
        text: otpEmailText(otp.code),
      });

      return NextResponse.json({ email, expiresAt: otp.expiresAt });
    }

    return NextResponse.json({ error: "Email address is required." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP" },
      { status: 500 }
    );
  }
}
