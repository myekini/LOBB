import { createAdminClient } from "@/lib/supabase/admin";

export type DevRole = "player" | "coach" | "admin";

export const DEV_PHONES: Record<DevRole, string> = {
  player: process.env.LOBB_DEV_PLAYER_PHONE || "+2340000000001",
  coach:  process.env.LOBB_DEV_COACH_PHONE || "+2340000000002",
  admin:  process.env.LOBB_DEV_ADMIN_PHONE || "+2340000000003",
};

const PLAYER_NAME = process.env.LOBB_DEV_PLAYER_NAME || "Muhammad";
const COACH_NAME = process.env.LOBB_DEV_COACH_NAME || "LOBB Coach";
const ADMIN_NAME = process.env.LOBB_DEV_ADMIN_NAME || "LOBB Admin";

const PLAYER_AVATAR =
  process.env.LOBB_DEV_PLAYER_AVATAR_URL ||
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80";

const COACH_AVATAR =
  process.env.LOBB_DEV_COACH_AVATAR_URL ||
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=512&q=80";

const DEV_PROFILES: Record<DevRole, Record<string, unknown>> = {
  player: {
    full_name: PLAYER_NAME,
    role: "player",
    avatar_url: PLAYER_AVATAR,
  },
  coach: {
    full_name: COACH_NAME,
    role: "coach",
    avatar_url: COACH_AVATAR,
  },
  admin: {
    full_name: ADMIN_NAME,
    role: "admin",
    avatar_url: null,
  },
};

const DEV_PLAYER_ROW = {
  full_name: PLAYER_NAME,
  skill_level: process.env.LOBB_DEV_PLAYER_SKILL_LEVEL || "Intermediate",
  preferred_locations: (process.env.LOBB_DEV_PLAYER_LOCATIONS || "Lekki,Victoria Island,Ikoyi")
    .split(",")
    .map((location) => location.trim())
    .filter(Boolean),
};

const DEV_COACH_ROW = {
  full_name:         COACH_NAME,
  headline:          process.env.LOBB_DEV_COACH_HEADLINE || "Verified LOBB coach · Footwork, beginners & match play",
  bio:               process.env.LOBB_DEV_COACH_BIO || "A verified LOBB coach helping Lagos players build cleaner technique, better movement, and match confidence.",
  hourly_rate_ngn:   Number(process.env.LOBB_DEV_COACH_RATE_NGN || 15000),
  experience_years:  Number(process.env.LOBB_DEV_COACH_EXPERIENCE_YEARS || 8),
  primary_location:  process.env.LOBB_DEV_COACH_LOCATION || "Lekki",
  service_areas:     (process.env.LOBB_DEV_COACH_SERVICE_AREAS || "Lekki,Victoria Island,Ikoyi,Oniru")
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean),
  skill_levels:      ["Beginner", "Intermediate", "All levels"],
  specializations:   ["Beginners", "Adults", "Footwork", "Match Play"],
  certifications:    ["LOBB Verified"],
  languages:         ["English"],
  court_access:      "coach_can_recommend",
  demo_video_url:    process.env.LOBB_DEV_COACH_DEMO_VIDEO_URL || null,
  profile_photo_url: COACH_AVATAR,
  status:            "active",
  is_verified:       true,
  slug:              process.env.LOBB_DEV_COACH_SLUG || "lobb-coach-dev",
};

const DEV_COACH_AVAILABILITY = [
  { day_of_week: 1, starts_at: "08:00:00", ends_at: "12:00:00" },
  { day_of_week: 2, starts_at: "16:00:00", ends_at: "20:00:00" },
  { day_of_week: 4, starts_at: "16:00:00", ends_at: "20:00:00" },
  { day_of_week: 6, starts_at: "08:00:00", ends_at: "13:00:00" },
];

export async function seedDevAccount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  phone: string,
  role: DevRole
) {
  await admin.from("profiles").upsert(
    { id: userId, phone_number: phone, ...DEV_PROFILES[role] },
    { onConflict: "id" }
  );

  if (role === "player") {
    await admin.from("players").upsert(
      { id: userId, ...DEV_PLAYER_ROW },
      { onConflict: "id" }
    );
    return;
  }

  if (role === "admin") {
    return;
  }

  await admin.from("coaches").upsert(
    { id: userId, ...DEV_COACH_ROW },
    { onConflict: "id" }
  );

  const { count } = await admin
    .from("coach_availability")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", userId);

  if (!count) {
    await admin.from("coach_availability").insert(
      DEV_COACH_AVAILABILITY.map((slot) => ({ coach_id: userId, ...slot, is_active: true }))
    );
  }
}
