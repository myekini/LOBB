import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type StepOnePayload = {
  full_name?: string;
  email?: string;
  headline?: string;
  profile_photo_url?: string;
};

type PreviousProfile = {
  id: string;
  phone_number: string | null;
  role: "player" | "coach" | "admin";
  full_name: string | null;
  email: string | null;
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
  const email = body.email?.trim().toLowerCase();
  const headline = body.headline?.trim();
  const profilePhotoUrl = body.profile_photo_url?.trim();

  if (!fullName || !email || !headline || !profilePhotoUrl) {
    return NextResponse.json({ error: "Name, email, headline, and profile photo are required." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: previousProfile } = await admin
    .from("profiles")
    .select("id, phone_number, role, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle<PreviousProfile>();

  const profilePayload = {
    id: user.id,
    role: "coach" as const,
    full_name: fullName,
    phone_number: user.phone || previousProfile?.phone_number || null,
    email,
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
    experience_years: 0,
    service_areas: [],
    skill_levels: [],
    certifications: [],
    profile_photo_url: profilePhotoUrl,
    status: "draft",
  }, { onConflict: "id", ignoreDuplicates: false });

  if (coachError) {
    if (previousProfile) {
      await admin
        .from("profiles")
        .upsert({
          id: previousProfile.id,
          phone_number: previousProfile.phone_number,
          role: previousProfile.role,
          full_name: previousProfile.full_name,
          email: previousProfile.email,
          avatar_url: previousProfile.avatar_url,
        });
    } else {
      await admin.from("profiles").delete().eq("id", user.id);
    }

    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
