import { NextResponse } from "next/server";
import { createOtp } from "@/lib/db-otp";
import { sendEmail, normalizeEmail } from "@/lib/email";

function getRequestedRole(role: string | undefined) {
  if (role === "coach") return "coach";
  return "player";
}

function otpEmailHtml(code: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #ece9e3;overflow:hidden">
        <tr><td style="padding:36px 36px 0">
          <p style="margin:0;font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#b85f2e">LOBB</p>
          <h1 style="margin:12px 0 0;font-size:26px;font-weight:900;color:#0d0d0d;line-height:1.2">Your login code</h1>
          <p style="margin:8px 0 0;font-size:15px;color:#6b6459;font-weight:500">Use this 6-digit code to sign in. It expires in 10 minutes.</p>
        </td></tr>
        <tr><td style="padding:28px 36px">
          <div style="background:#faf9f7;border:1px solid #ece9e3;border-radius:16px;padding:24px;text-align:center">
            <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:0.3em;color:#0d0d0d;font-variant-numeric:tabular-nums">${code}</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 36px 36px">
          <p style="margin:0;font-size:13px;color:#9b958a;line-height:1.6">If you didn't request this code, you can safely ignore this email. Someone may have typed your address by mistake.</p>
          <p style="margin:20px 0 0;font-size:12px;color:#c5bfb8">© LOBB — Lagos tennis coaching platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpEmailText(code: string) {
  return `Your LOBB login code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\n\n— LOBB`;
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

      const otp = await createOtp(email, role);
      if ("error" in otp) {
        return NextResponse.json({ error: otp.error }, { status: 429 });
      }

      await sendEmail({
        to: email,
        subject: `${otp.code} is your LOBB login code`,
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
