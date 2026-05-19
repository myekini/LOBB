import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Only active when LOBB_ENABLE_TEST_OTP=true ──────────────────────────────
// This route is a dev convenience — it NEVER ships to production in a live state
// because isTestOtpEnabled() blocks it.

function isTestMode() {
  return process.env.LOBB_ENABLE_TEST_OTP === "true";
}

const TEST_PHONES: Record<"player" | "coach", string> = {
  player: "+2340000000001",
  coach:  "+2340000000002",
};

const TEST_PROFILES: Record<"player" | "coach", Record<string, unknown>> = {
  player: {
    full_name: "Test Player",
    role: "player",
  },
  coach: {
    full_name: "Test Coach Ada",
    role: "coach",
  },
};

const TEST_COACH_ROW = {
  full_name:        "Test Coach Ada",
  headline:         "ITF Certified · Lekki & VI",
  bio:              "Test coach account for local development. Used to verify booking flows, availability management, and coach dashboard features end-to-end without affecting real data.",
  hourly_rate_ngn:  15000,
  primary_location: "Lekki",
  service_areas:    ["Lekki", "Victoria Island", "Ikoyi"],
  skill_levels:     ["Beginner", "Intermediate", "All levels"],
  specializations:  ["Beginners", "Adults"],
  certifications:   ["ITF Level 1"],
  languages:        ["English"],
  court_access:     "player_arranges",
  status:           "active",
  is_verified:      true,
  slug:             "test-coach-ada",
};

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
  if (!isTestMode()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role = body.role === "coach" ? "coach" : "player";
  const phone = TEST_PHONES[role];
  const { email, password } = getSyntheticCredentials(phone);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createAdminClient();

  // Try to sign in; create account if it doesn't exist yet
  let signIn = await authClient.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    // First time — create the Supabase user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone, requested_role: role },
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "Could not create test user" }, { status: 500 });
    }

    // Seed the profile row
    await admin.from("profiles").upsert(
      { id: created.user.id, phone_number: phone, ...TEST_PROFILES[role] },
      { onConflict: "id" }
    );

    // Seed coach row if needed
    if (role === "coach") {
      await admin.from("coaches").upsert(
        { id: created.user.id, ...TEST_COACH_ROW },
        { onConflict: "id" }
      );
    }

    signIn = await authClient.auth.signInWithPassword({ email, password });
  } else {
    // User exists — ensure profile + coach row are still correct (idempotent)
    const userId = signIn.data.user?.id;
    if (userId) {
      await admin.from("profiles").upsert(
        { id: userId, phone_number: phone, ...TEST_PROFILES[role] },
        { onConflict: "id" }
      );
      if (role === "coach") {
        await admin.from("coaches").upsert(
          { id: userId, ...TEST_COACH_ROW },
          { onConflict: "id" }
        );
      }
    }
  }

  if (signIn.error || !signIn.data.session) {
    return NextResponse.json({ error: signIn.error?.message ?? "Sign-in failed" }, { status: 500 });
  }

  return NextResponse.json({ session: signIn.data.session, user: signIn.data.user, role, phone });
}
