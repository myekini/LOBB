import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StepOnePayload = {
  full_name?: string;
  headline?: string;
  profile_photo_url?: string;
};

type PreviousProfile = {
  id: string;
  phone_number: string | null;
  role: "player" | "coach" | "admin";
  full_name: string | null;
  avatar_url: string | null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as StepOnePayload;
  const fullName = body.full_name?.trim();
  const headline = body.headline?.trim();
  const profilePhotoUrl = body.profile_photo_url?.trim();

  if (!fullName || !headline || !profilePhotoUrl) {
    return NextResponse.json({ error: "Name, headline, and profile photo are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: previousProfile } = await admin
    .from("profiles")
    .select("id, phone_number, role, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<PreviousProfile>();

  const profilePayload = {
    id: user.id,
    role: "coach" as const,
    full_name: fullName,
    phone_number: user.phone || previousProfile?.phone_number || null,
    avatar_url: profilePhotoUrl,
  };

  const { error: profileError } = await admin.from("profiles").upsert(profilePayload);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { error: coachError } = await admin.from("coaches").upsert({
    id: user.id,
    full_name: fullName,
    headline,
    bio: null,
    hourly_rate_ngn: null,
    experience_years: 0,
    primary_location: null,
    service_areas: [],
    skill_levels: [],
    certifications: [],
    profile_photo_url: profilePhotoUrl,
    status: "draft",
  });

  if (coachError) {
    if (previousProfile) {
      await admin
        .from("profiles")
        .upsert({
          id: previousProfile.id,
          phone_number: previousProfile.phone_number,
          role: previousProfile.role,
          full_name: previousProfile.full_name,
          avatar_url: previousProfile.avatar_url,
        });
    } else {
      await admin.from("profiles").delete().eq("id", user.id);
    }

    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
