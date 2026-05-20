import { NextResponse } from "next/server";
import { createOtp, shouldUseTestOtp } from "@/lib/db-otp";
import { formatNigerianPhoneNumber } from "@/lib/phone";
import { sendOtpSms } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; role?: string };

    if (!body.phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const phone = formatNigerianPhoneNumber(body.phone);
    const role = body.role === "coach" ? "coach" : "player";
    const otp = await createOtp(phone, role);

    if ("error" in otp) {
      return NextResponse.json({ error: otp.error }, { status: 429 });
    }

    if (!shouldUseTestOtp(phone)) {
      await sendOtpSms({
        phone,
        message: `Your LOBB login code is ${otp.code}. It expires in 10 minutes.`,
      });
    }

    return NextResponse.json({ phone, expiresAt: otp.expiresAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send OTP" },
      { status: 500 }
    );
  }
}
