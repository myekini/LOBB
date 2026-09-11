import type { SupabaseClient } from "@supabase/supabase-js";

type Role = "player" | "coach" | "admin";

/**
 * Validate a `?next=` destination against the signed-in user's role.
 * Returns the path when it's safe to send them there, otherwise null.
 */
export function getSafeNextPath(nextPath: string | undefined | null, role: string | undefined): string | null {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }
  if (nextPath.startsWith("/admin") && role !== "admin") return null;
  if (nextPath.startsWith("/coach") && role !== "coach" && role !== "admin") return null;
  if (
    (nextPath.startsWith("/home") ||
      nextPath.startsWith("/dashboard") ||
      nextPath.startsWith("/profile") ||
      nextPath.startsWith("/book")) &&
    role === "coach"
  ) {
    return null;
  }
  return nextPath;
}

/**
 * Where a returning user lands after a password or passkey sign-in.
 * Mirrors the routing in /auth/verify for the OTP path, minus the
 * first-signup profile bootstrapping (a password/passkey login always
 * belongs to an already-provisioned account).
 */
export async function resolvePostAuthPath(
  supabase: SupabaseClient,
  userId: string,
  opts: { nextPath?: string | null } = {},
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();

  const role = profile?.role as Role | undefined;
  const safeNext = getSafeNextPath(opts.nextPath, role);
  if (safeNext && role && profile?.full_name) return safeNext;

  if (role === "coach") return profile?.full_name ? "/coach/dashboard" : "/auth/setup/coach/1";
  if (role === "admin") return "/admin";
  if (role === "player") return profile?.full_name ? "/home" : "/auth/setup/player";

  return "/auth/role";
}
