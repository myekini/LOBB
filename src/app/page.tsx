import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CoachPublicProfile } from "@/lib/types";
import { LandingSplash } from "@/features/marketing/landing-splash";

// Public marketing home. Middleware already redirects signed-in users to their
// app, so this route only renders for logged-out visitors — the auth check
// below is just a defensive fallback for when middleware is skipped.
export default async function Home() {
  const supabase = createClient();

  const [{ data: { user } }, { data: coaches }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("coach_profiles_public")
      .select("*")
      .eq("status", "active")
      .order("session_count", { ascending: false })
      .limit(3),
  ]);

  if (user) {
    const role =
      (user.app_metadata?.role as "player" | "coach" | "admin" | undefined) ??
      (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role;
    if (role === "coach") redirect("/coach/dashboard");
    if (role === "admin") redirect("/admin");
    if (role === "player") redirect("/home");
  }

  return <LandingSplash coaches={(coaches ?? []) as CoachPublicProfile[]} />;
}
