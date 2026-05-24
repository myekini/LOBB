import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/db-otp";
import { formatNigerianPhoneNumber } from "@/lib/phone";
import { getSupabaseServerKey } from "@/lib/supabase/server";

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseServerKey();

  if (!url || !key) {
    throw new Error("Supabase is not configured");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSyntheticCredentials(phone: string) {
  const secret =
    process.env.AUTH_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.TWILIO_AUTH_TOKEN ||
    "lobb-local-dev-secret";
  const localPart = phone.replace(/\D/g, "");
  const password = createHmac("sha256", secret)
    .update(`lobb:${phone}`)
    .digest("base64url");
  const domain = process.env.AUTH_EMAIL_DOMAIN || "gmail.com";

  return {
    email: `lobb.phone.${localPart}@${domain}`,
    password,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; code?: string; otp?: string; role?: "player" | "coach" | "admin" };

    const requestedCode = body.code ?? body.otp;

    if (!body.phone || !requestedCode) {
      return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
    }

    const phone = formatNigerianPhoneNumber(body.phone);
    const code = requestedCode.replace(/\D/g, "");

    if (code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
    }

    const otpResult = await verifyOtp(phone, code);
    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    const authClient = getAuthClient();
    const adminClient = getAdminClient();
    const { email, password } = getSyntheticCredentials(phone);

    let signIn = await authClient.auth.signInWithPassword({ email, password });
    let session = signIn.data.session;
    let user = signIn.data.user;

    if (signIn.error && adminClient) {
      const { data: created } = await adminClient.auth.admin.createUser({
        email,
        password,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          phone,
          requested_role: otpResult.role,
        },
      });

      // Stamp the correct role immediately so DB triggers don't default to "player"
      // for users who signed up via the coach flow.
      if (created?.user && otpResult.role && otpResult.role !== "player") {
        await adminClient
          .from("profiles")
          .upsert(
            { id: created.user.id, role: otpResult.role, phone_number: phone },
            { onConflict: "id" }
          );
      }

      signIn = await authClient.auth.signInWithPassword({ email, password });
      session = signIn.data.session;
      user = signIn.data.user;
    }

    if (signIn.error) {
      return NextResponse.json(
        {
          error:
            "First-time WhatsApp login needs SUPABASE_SERVICE_ROLE_KEY configured so LOBB can create the Supabase user without sending email.",
        },
        { status: 500 }
      );
    }

    if (!session || !user) {
      return NextResponse.json({ error: "Could not start your session" }, { status: 400 });
    }

    return NextResponse.json({
      session,
      user,
      phone,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify OTP" },
      { status: 500 }
    );
  }
}

