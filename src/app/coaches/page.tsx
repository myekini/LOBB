import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachPublicProfile } from "@/lib/types";
import { CoachesClient } from "./coaches-client";

export const revalidate = 60; // cache page for 60 s, background revalidation

export default async function CoachesPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("coach_profiles_public")
    .select("*")
    .eq("status", "active")
    .order("session_count", { ascending: false });

  const coaches = (error ? [] : data) as CoachPublicProfile[];

  return <CoachesClient initialCoaches={coaches} />;
}
