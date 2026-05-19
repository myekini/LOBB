import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoachProfileContent } from "@/app/coaches/[slug]/coach-profile-content";
import type { CoachPublicProfile, CourtAccess } from "@/lib/types";

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function CoachProfilePreviewPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: coach, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !coach) redirect("/auth/setup/coach/1");

  const previewCoach: CoachPublicProfile = {
    ...(coach as CoachPublicProfile),
    full_name: coach.full_name ?? "Coach",
    bio: coach.bio ?? "",
    headline: coach.headline ?? null,
    hourly_rate_ngn: coach.hourly_rate_ngn ?? 0,
    experience_years: coach.experience_years ?? 0,
    primary_location: coach.primary_location ?? "Lagos",
    service_areas: asArray(coach.service_areas),
    skill_levels: asArray(coach.skill_levels),
    specializations: asArray(coach.specializations),
    languages: asArray(coach.languages),
    certifications: asArray(coach.certifications),
    court_access: (coach.court_access ?? "player_arranges") as CourtAccess,
    demo_video_url: coach.demo_video_url ?? null,
    profile_photo_url: coach.profile_photo_url ?? null,
    slug: coach.slug ?? null,
    status: coach.status ?? "draft",
    is_verified: Boolean(coach.is_verified),
    avg_rating: null,
    review_count: 0,
    session_count: coach.sessions_completed ?? 0,
    has_availability: false,
    created_at: coach.created_at ?? new Date().toISOString(),
  };

  return <CoachProfileContent coach={previewCoach} isPreview />;
}
