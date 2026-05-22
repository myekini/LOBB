import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type DevRole = "player" | "coach" | "admin";

const TEST_PHONE = "+2348164555012";

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

export async function POST(request: Request) {
  if (process.env.LOBB_ENABLE_DEV_LOGIN !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role = body.role as DevRole;

  if (!role || !["player", "coach", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Create a server client to check the current session
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const phone = user.user_metadata?.phone || user.phone || TEST_PHONE;

  // Seed and update the user's role
  await seedDevAccount(adminClient, user.id, phone, role);

  return NextResponse.json({ success: true, role, redirectUrl: role === "coach" ? "/coach/dashboard" : role === "admin" ? "/admin" : "/" });
}
