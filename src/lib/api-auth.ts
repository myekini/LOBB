import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

type RequireRoleResult = Awaited<ReturnType<typeof requireRole>>;
export type AuthOk = {
  supabase: RequireRoleResult["supabase"];
  user: NonNullable<RequireRoleResult["user"]>;
  profile: NonNullable<RequireRoleResult["profile"]>;
  admin: NonNullable<RequireRoleResult["admin"]>;
  error: null;
  status: 200;
};

export async function getAuthedUser() {
  const supabase = createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await admin
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

  // JWT role (from custom_access_token_hook) is the authoritative value when present.
  // Falls back to the profile row for sessions that predate the hook.
  const effectiveRole = (auth.user.app_metadata?.role ?? auth.profile.role) as UserRole;

  if (!roles.includes(effectiveRole)) {
    return { ...auth, admin: null, error: "Forbidden" as const, status: 403 };
  }

  return { ...auth, admin: createAdminClient(), error: null, status: 200 };
}

// Enforces auth and role in one declaration. Replaces the manual requireRole() +
// error-guard pattern. New routes should always use this instead of requireRole() directly.
//
// Usage (no dynamic params):
//   export const GET = withRole("coach", async (request, auth) => { ... });
//
// Usage (dynamic params):
//   export const POST = withRole("admin", async (request, auth, { params }) => {
//     const { id } = params as { id: string };
//   });
//
// PUBLIC routes (no auth needed) must be annotated with:
//   // PUBLIC ROUTE — no authentication required
export function withRole(
  role: UserRole | UserRole[],
  handler: (
    request: Request,
    auth: AuthOk,
    context: { params?: Record<string, string> }
  ) => Promise<Response>
) {
  return async (
    request: Request,
    context: { params?: Record<string, string> } = {}
  ): Promise<Response> => {
    const auth = await requireRole(role);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return handler(request, auth as unknown as AuthOk, context);
  };
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng";
  return `${base.replace(/\/$/, "")}${path}`;
}
