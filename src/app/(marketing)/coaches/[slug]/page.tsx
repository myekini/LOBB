import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachPublicProfile } from "@/lib/types";
import { CoachProfileContent } from "./coach-profile-content";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();
  let query = supabase
    .from("coach_profiles_public")
    .select("full_name, headline, primary_location")
    .eq("status", "active");
  query = isUuid(params.slug) ? query.eq("id", params.slug) : query.eq("slug", params.slug);
  const { data } = await query.maybeSingle();

  if (!data) return { title: "Coach | LOBB" };

  return {
    title: `${data.full_name} | Tennis Coach in ${data.primary_location} | LOBB`,
    description: data.headline ?? `Book a session with ${data.full_name} on LOBB.`,
  };
}

export default async function CoachSlugPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient();

  let query = supabase
    .from("coach_profiles_public")
    .select("*")
    .eq("status", "active");
  query = isUuid(params.slug) ? query.eq("id", params.slug) : query.eq("slug", params.slug);
  const { data } = await query.maybeSingle();

  if (!data) notFound();

  return <CoachProfileContent coach={data as CoachPublicProfile} />;
}
