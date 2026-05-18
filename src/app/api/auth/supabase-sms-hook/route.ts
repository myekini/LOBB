import { NextResponse } from "next/server";
import { sendOtpSms } from "@/lib/sms";

type SupabaseSmsHookPayload = {
  user?: {
    phone?: string;
  };
  sms?: {
    otp?: string;
  };
};

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const hookSecret = request.headers.get("x-lobb-hook-secret");

  return authorization === `Bearer ${secret}` || hookSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as SupabaseSmsHookPayload;
  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;

  if (!phone || !otp) {
    return NextResponse.json({ error: "Invalid Supabase SMS hook payload" }, { status: 400 });
  }

  await sendOtpSms({
    phone,
    message: `Your LOBB login code is ${otp}. It expires shortly.`,
  });

  return new NextResponse(null, { status: 200 });
}
