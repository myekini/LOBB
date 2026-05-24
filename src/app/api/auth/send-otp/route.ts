import { NextResponse } from "next/server";
import { createOtp, getTestOtp, isTestOtpEnabled, shouldUseTestOtp } from "@/lib/db-otp";
import { formatNigerianPhoneNumber } from "@/lib/phone";
import { sendOtpSms } from "@/lib/sms";

function getRequestedRole(role: string | undefined) {
  if (role === "coach") return "coach";
  if (role === "admin" && process.env.LOBB_ENABLE_DEV_LOGIN === "true") return "admin";
  return "player";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; role?: string };

    if (!body.phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const phone = formatNigerianPhoneNumber(body.phone);
    const role = getRequestedRole(body.role);
    const otp = await createOtp(phone, role);

    if ("error" in otp) {
      return NextResponse.json({ error: otp.error }, { status: 429 });
    }

    const isTestPhone = shouldUseTestOtp(phone);

    if (!isTestPhone) {
      // Fire-and-forget in test mode — Twilio trial can't message unverified numbers,
      // so we swallow the error and fall through to the devCode hint below.
      try {
        await sendOtpSms({
          phone,
          message: `Your LOBB login code is ${otp.code}. It expires in 10 minutes.`,
        });
      } catch (err) {
        if (!isTestOtpEnabled()) throw err;
        // In test mode: SMS failed (likely Twilio trial). Code is in the DB — the
        // devCode hint below lets the developer complete the flow without SMS.
        console.warn("[send-otp] SMS failed in test mode, returning devCode hint:", err instanceof Error ? err.message : err);
      }
    }

    // In test mode, always echo the code back so any phone number can be used locally.
    const devCode = isTestOtpEnabled() ? (isTestPhone ? getTestOtp() : otp.code) : undefined;

    return NextResponse.json({
      phone,
      expiresAt: otp.expiresAt,
      ...(devCode ? { devCode } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP" },
      { status: 500 }
    );
  }
}
