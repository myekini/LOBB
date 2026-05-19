import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachPublicProfile } from "@/lib/types";
import { CoachProfileContent } from "./coach-profile-content";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("coach_profiles_public")
    .select("full_name, headline, primary_location")
    .eq("slug", params.slug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return { title: "Coach | LOBB" };

  return {
    title: `${data.full_name} — Tennis Coach in ${data.primary_location} | LOBB`,
    description: data.headline ?? `Book a session with ${data.full_name} on LOBB.`,
  };
}

export default async function CoachSlugPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("coach_profiles_public")
    .select("*")
    .eq("slug", params.slug)
    .eq("status", "active")
    .maybeSingle();

  if (!data) notFound();

  return <CoachProfileContent coach={data as CoachPublicProfile} />;
}
