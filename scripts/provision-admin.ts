/**
 * Local-only admin provisioning script.
 * Never runs in production — use this instead of the /api/admin/setup endpoint.
 *
 * Usage:
 *   npx tsx scripts/provision-admin.ts
 *
 * Required env vars (copy from .env.local or pass inline):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAILS   (comma-separated: hello@lobb.ng,ops@lobb.ng)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawEmails = process.env.ADMIN_EMAILS ?? "";

if (!url || !key) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const emails = rawEmails
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (emails.length === 0) {
  console.error("❌  ADMIN_EMAILS is empty. Set it to a comma-separated list of emails.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data } = await supabase
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

async function main() {
  console.log(`\nProvisioning ${emails.length} admin account(s):\n`);

  for (const email of emails) {
    let userId = await getUserIdByEmail(email);

    if (!userId) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { requested_role: "admin" },
      });

      if (error || !created?.user) {
        console.error(`  ✗ ${email} — failed to create: ${error?.message ?? "unknown"}`);
        continue;
      }

      userId = created.user.id;
      console.log(`  + ${email} — created auth user ${userId}`);
    } else {
      console.log(`  ~ ${email} — found existing auth user ${userId}`);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, email, role: "admin" }, { onConflict: "id" });

    if (profileError) {
      console.error(`  ✗ ${email} — profile upsert failed: ${profileError.message}`);
    } else {
      console.log(`  ✓ ${email} — role set to admin`);
    }
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
