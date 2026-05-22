import { createHmac } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

function isDevRoleOverrideEnabled() {
  return process.env.LOBB_ENABLE_DEV_LOGIN === "true";
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
      await adminClient.auth.admin.createUser({
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

    if (adminClient && isDevRoleOverrideEnabled() && body.role && ["player", "coach", "admin"].includes(body.role)) {
      await seedDevAccount(adminClient, user.id, phone, body.role);
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

type DevRole = "player" | "coach" | "admin";

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
  admin: SupabaseClient,
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
