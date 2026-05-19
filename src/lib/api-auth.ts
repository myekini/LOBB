import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

export async function getAuthedUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, phone_number, email, full_name, avatar_url, is_active")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function requireRole(role: UserRole | UserRole[]) {
  const auth = await getAuthedUser();
  const roles = Array.isArray(role) ? role : [role];

  if (!auth.user || !auth.profile) {
    return { ...auth, admin: null, error: "Unauthorised" as const, status: 401 };
  }

  if (!roles.includes(auth.profile.role as UserRole)) {
    return { ...auth, admin: null, error: "Forbidden" as const, status: 403 };
  }

  return { ...auth, admin: createAdminClient(), error: null, status: 200 };
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng";
  return `${base.replace(/\/$/, "")}${path}`;
}
