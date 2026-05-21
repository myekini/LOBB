import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Only active when LOBB_ENABLE_DEV_LOGIN=true ─────────────────────────────
// This route is a dev convenience — it NEVER ships to production in a live state
// because isDevLoginEnabled() blocks it.

type DevRole = "player" | "coach" | "admin";

function isDevLoginEnabled() {
  return process.env.LOBB_ENABLE_DEV_LOGIN === "true";
}

const TEST_PHONE = "+2348164555012";

const TEST_PHONES: Record<DevRole, string> = {
  player: TEST_PHONE,
  coach:  TEST_PHONE,
  admin:  TEST_PHONE,
};

const TEST_PROFILES: Record<DevRole, Record<string, unknown>> = {
  player: {
    full_name: "Tobi Adeyemi",
    role: "player",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80",
  },
  coach: {
    full_name: "Ada Okafor",
    role: "coach",
    avatar_url: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=512&q=80",
  },
  admin: {
    full_name: "LOBB Admin",
    role: "admin",
    avatar_url: null,
  },
};

const TEST_PLAYER_ROW = {
  full_name: "Tobi Adeyemi",
  skill_level: "Intermediate",
  preferred_locations: ["Lekki", "Victoria Island", "Ikoyi"],
};

const TEST_COACH_ROW = {
  full_name:         "Ada Okafor",
  headline:          "ITF Level 1 Coach · Footwork, beginners & match play",
  bio:               "Ada is a patient Lagos tennis coach who helps beginners build clean fundamentals and intermediate players sharpen footwork, consistency, and match confidence.",
  hourly_rate_ngn:   15000,
  experience_years:  8,
  primary_location:  "Lekki",
  service_areas:     ["Lekki", "Victoria Island", "Ikoyi", "Oniru"],
  skill_levels:      ["Beginner", "Intermediate", "All levels"],
  specializations:   ["Beginners", "Adults", "Footwork", "Match Play"],
  certifications:    ["ITF Level 1"],
  languages:         ["English", "Yoruba"],
  court_access:      "coach_can_recommend",
  demo_video_url:    null,
  profile_photo_url: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=512&q=80",
  status:            "active",
  is_verified:       true,
  slug:              "ada-okafor-dev",
};

const TEST_COACH_AVAILABILITY = [
  { day_of_week: 1, starts_at: "08:00:00", ends_at: "12:00:00" },
  { day_of_week: 2, starts_at: "16:00:00", ends_at: "20:00:00" },
  { day_of_week: 4, starts_at: "16:00:00", ends_at: "20:00:00" },
  { day_of_week: 6, starts_at: "08:00:00", ends_at: "13:00:00" },
];

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
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role: DevRole = body.role === "coach" ? "coach" : body.role === "admin" ? "admin" : "player";
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

    await seedDevAccount(admin, created.user.id, phone, role);

    signIn = await authClient.auth.signInWithPassword({ email, password });
  } else {
    // User exists — ensure profile + coach row are still correct (idempotent)
    const userId = signIn.data.user?.id;
    if (userId) {
      await seedDevAccount(admin, userId, phone, role);
    }
  }

  if (signIn.error || !signIn.data.session) {
    return NextResponse.json({ error: signIn.error?.message ?? "Sign-in failed" }, { status: 500 });
  }

  return NextResponse.json({ session: signIn.data.session, user: signIn.data.user, role, phone });
}

async function seedDevAccount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  phone: string,
  role: DevRole
) {
  await admin.from("profiles").upsert(
    { id: userId, phone_number: phone, ...TEST_PROFILES[role] },
    { onConflict: "id" }
  );

  if (role === "player") {
    await admin.from("players").upsert(
      { id: userId, ...TEST_PLAYER_ROW },
      { onConflict: "id" }
    );
    return;
  }

  if (role === "admin") {
    return;
  }

  await admin.from("coaches").upsert(
    { id: userId, ...TEST_COACH_ROW },
    { onConflict: "id" }
  );

  await admin.from("coach_availability").delete().eq("coach_id", userId);
  await admin.from("coach_availability").insert(
    TEST_COACH_AVAILABILITY.map((slot) => ({ coach_id: userId, ...slot }))
  );
}
