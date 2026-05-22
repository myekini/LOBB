import { NextResponse } from "next/server";
import { createOtp, getTestOtp, shouldUseTestOtp } from "@/lib/db-otp";
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

    const isTestOtp = shouldUseTestOtp(phone);

    if (!isTestOtp) {
      await sendOtpSms({
        phone,
        message: `Your LOBB login code is ${otp.code}. It expires in 10 minutes.`,
      });
    }

    return NextResponse.json({
      phone,
      expiresAt: otp.expiresAt,
      ...(isTestOtp ? { devCode: getTestOtp() } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP" },
      { status: 500 }
    );
  }
}
