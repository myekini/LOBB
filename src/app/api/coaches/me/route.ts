import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachRow, CourtAccess } from "@/lib/types";

// Fields a coach is allowed to update via this endpoint
type CoachUpdatePayload = Partial<
  Pick<
    CoachRow,
    | "full_name"
    | "headline"
    | "bio"
    | "demo_video_url"
    | "hourly_rate_ngn"
    | "primary_location"
    | "service_areas"
    | "skill_levels"
    | "specializations"
    | "languages"
    | "certifications"
    | "court_access"
    | "profile_photo_url"
  >
>;

const ALLOWED_COURT_ACCESS = new Set<CourtAccess>([
  "coach_has_access",
  "player_arranges",
  "coach_can_recommend",
]);

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Include stats from the view for the dashboard display
    const { data, error } = await admin
      .from("coach_profiles_public")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    return NextResponse.json({ coach: data });
  } catch {
    return NextResponse.json({ error: "Unable to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Verify the user is actually a coach
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CoachUpdatePayload;

    // Whitelist: only known safe fields
    const allowed: CoachUpdatePayload = {};

    if (typeof body.full_name === "string") {
      const v = body.full_name.trim();
      if (!v) return NextResponse.json({ error: "Full name cannot be empty" }, { status: 400 });
      allowed.full_name = v;
    }
    if (typeof body.headline === "string") {
      allowed.headline = body.headline.trim().slice(0, 150) || null;
    }
    if (typeof body.bio === "string") {
      const v = body.bio.trim();
      if (v.length < 50)
        return NextResponse.json({ error: "Bio must be at least 50 characters" }, { status: 400 });
      if (v.length > 600)
        return NextResponse.json({ error: "Bio must be 600 characters or less" }, { status: 400 });
      allowed.bio = v;
    }
    if (body.demo_video_url !== undefined) {
      allowed.demo_video_url = body.demo_video_url ? String(body.demo_video_url).trim() : null;
    }
    if (typeof body.hourly_rate_ngn === "number") {
      if (body.hourly_rate_ngn < 1000)
        return NextResponse.json({ error: "Minimum rate is ₦1,000" }, { status: 400 });
      allowed.hourly_rate_ngn = body.hourly_rate_ngn;
    }
    if (typeof body.primary_location === "string") {
      allowed.primary_location = body.primary_location.trim();
    }
    if (Array.isArray(body.service_areas)) {
      allowed.service_areas = body.service_areas.map(String);
    }
    if (Array.isArray(body.skill_levels)) {
      allowed.skill_levels = body.skill_levels.map(String);
    }
    if (Array.isArray(body.specializations)) {
      allowed.specializations = body.specializations.map(String);
    }
    if (Array.isArray(body.languages)) {
      allowed.languages = body.languages.map(String);
    }
    if (Array.isArray(body.certifications)) {
      allowed.certifications = body.certifications.map(String);
    }
    if (body.court_access !== undefined) {
      if (!ALLOWED_COURT_ACCESS.has(body.court_access as CourtAccess)) {
        return NextResponse.json({ error: "Invalid court access value" }, { status: 400 });
      }
      allowed.court_access = body.court_access as CourtAccess;
    }
    if (typeof body.profile_photo_url === "string") {
      allowed.profile_photo_url = body.profile_photo_url.trim() || null;
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("coaches")
      .update(allowed)
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Also sync full_name to profiles table when updated
    if (allowed.full_name) {
      await supabase
        .from("profiles")
        .update({ full_name: allowed.full_name })
        .eq("id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 });
  }
}
