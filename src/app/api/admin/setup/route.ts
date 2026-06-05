import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email";

/**
 * Admin provisioning endpoint. Protected by ADMIN_SETUP_SECRET.
 *
 * POST   — provision all emails in ADMIN_EMAILS as admins
 * GET    — list currently provisioned admins
 * DELETE — revoke admin role (body: { email })
 *
 * Usage:
 *   curl -X POST https://lobb.ng/api/admin/setup \
 *     -H "Authorization: Bearer <ADMIN_SETUP_SECRET>"
 *
 * Required env vars:
 *   ADMIN_SETUP_SECRET  — long random secret, never committed to git
 *   ADMIN_EMAILS        — comma-separated list: hello@lobb.ng,ops@lobb.ng
 */

// This endpoint is DISABLED by default in production.
// To provision admins without running the local script:
//   1. Set ADMIN_PROVISIONING_ENABLED=true in your environment temporarily
//   2. Call the endpoint with the ADMIN_SETUP_SECRET bearer token
//   3. Remove ADMIN_PROVISIONING_ENABLED immediately after
//
// Preferred approach: run `npx tsx scripts/provision-admin.ts` locally instead.
function isProvisioningEnabled(): boolean {
  return process.env.ADMIN_PROVISIONING_ENABLED === "true";
}

function authorize(request: Request): boolean {
  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) return false;
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return token === secret;
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => normalizeEmail(e.trim()) ?? "")
    .filter(Boolean);
}

// POST — provision all ADMIN_EMAILS
export async function POST(request: Request) {
  if (!isProvisioningEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emails = getAdminEmails();
  if (emails.length === 0) {
    return NextResponse.json(
      { error: "ADMIN_EMAILS is not set or contains no valid addresses." },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const results = await Promise.all(
    emails.map(async (email) => {
      // Look up the auth user directly by email instead of fetching all users.
      const { data: authUser } = await supabase
        .schema("auth")
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      let userId = authUser?.id as string | undefined;

      if (!userId) {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { requested_role: "admin" },
        });
        if (error || !created?.user) {
          return { email, ok: false, error: error?.message ?? "Failed to create user" };
        }
        userId = created.user.id;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, email, role: "admin" }, { onConflict: "id" });

      if (profileError) {
        return { email, ok: false, error: profileError.message };
      }

      return { email, ok: true, userId };
    })
  );

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    { provisioned: results, success: failed.length === 0 },
    { status: failed.length > 0 ? 207 : 200 }
  );
}

// GET — list current admins
export async function GET(request: Request) {
  if (!isProvisioningEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ admins: data ?? [] });
}

// DELETE — revoke admin role (demote to player)
export async function DELETE(request: Request) {
  if (!isProvisioningEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "player" })
    .eq("email", email)
    .eq("role", "admin");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, revoked: email });
}
