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

function getRequestedRole(role: string | undefined): "coach" | "player" {
  return role === "coach" ? "coach" : "player";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; role?: string };
    const email = normalizeEmail(body.email);
    const isSignup = Boolean(body.role);

    if (!email) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Login mode (no role in body) — verify the account exists before sending an OTP.
    // Prevents silent account creation for users who meant to log in.
    if (!isSignup) {
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

    const role = getRequestedRole(body.role);
    const supabase = getAnonClient();

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: isSignup,
        // Role in metadata is read by the handle_new_user DB trigger on first signup
        ...(isSignup ? { data: { role } } : {}),
      },
    });

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      console.error("[send-otp] signInWithOtp error:", signInError.message, signInError.status);
      if (msg.includes("signup") || msg.includes("signups not allowed")) {
        return NextResponse.json(
          { error: "No account found with this email. Sign up first." },
          { status: 404 }
        );
      }
      if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("email rate")) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a minute before trying again." },
          { status: 429 }
        );
      }
      if (msg.includes("security purposes") || msg.includes("after ")) {
        // Supabase per-email cooldown: "For security purposes, you can only request this after X seconds"
        const seconds = signInError.message.match(/after (\d+) second/)?.[1];
        const wait = seconds ? `${seconds} seconds` : "a moment";
        return NextResponse.json(
          { error: `Please wait ${wait} before requesting another code.` },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Could not send code. Try again." }, { status: 500 });
    }

    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ error: "Unable to send login code." }, { status: 500 });
  }
}
