import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email";

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      otp?: string;
      role?: "player" | "coach" | "admin";
    };

    const code = (body.code ?? body.otp ?? "").replace(/\D/g, "");
    if (code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const supabase = getAnonClient();

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verifyError || !data.session || !data.user) {
      const msg = (verifyError?.message ?? "").toLowerCase();
      if (msg.includes("expired")) {
        return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
      }
      if (msg.includes("invalid") || msg.includes("not found") || msg.includes("otp")) {
        return NextResponse.json({ error: "Wrong code. Try again." }, { status: 400 });
      }
      return NextResponse.json(
        { error: verifyError?.message ?? "Could not verify code. Try again." },
        { status: 400 }
      );
    }

    const { session, user } = data;
    const admin = createAdminClient();

    // Referral attribution — read first-touch cookie, link to referring coach on first sign-in
    const cookieHeader = request.headers.get("cookie") ?? "";
    const refMatch = cookieHeader.split(";").find((c) => c.trim().startsWith("lobb_ref="));
    const refCode = refMatch ? refMatch.split("=")[1]?.trim().toUpperCase() : null;
    if (refCode) {
      const { data: referringCoach } = await admin
        .from("coaches")
        .select("id")
        .eq("referral_code", refCode)
        .eq("status", "active")
        .maybeSingle();
      if (referringCoach) {
        await admin
          .from("profiles")
          .update({
            referred_by_coach_id: referringCoach.id,
            referred_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .is("referred_by_coach_id", null); // only set once
      }
    }

    return NextResponse.json({ session, user, email });
  } catch {
    return NextResponse.json({ error: "Unable to verify OTP." }, { status: 500 });
  }
}
