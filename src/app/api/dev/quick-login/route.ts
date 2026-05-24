import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_PHONES, type DevRole, seedDevAccount } from "@/lib/dev-account-seed";

// ─── Only active when LOBB_ENABLE_DEV_LOGIN=true ─────────────────────────────
// Seeds or refreshes only the dev account identity. Availability is created
// only when missing, so bookings and operational state are left intact.
// Go-live cleanup: delete these 3 rows from auth.users + profiles.

function isDevLoginEnabled() {
  return process.env.LOBB_ENABLE_DEV_LOGIN === "true";
}

function getSyntheticCredentials(phone: string) {
  const secret =
    process.env.AUTH_SESSION_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.TWILIO_AUTH_TOKEN ||
    "lobb-local-dev-secret";
  const localPart = phone.replace(/\D/g, "");
  const password = createHmac("sha256", secret)
    .update(`lobb:${phone}`)
    .digest("base64url");
  const domain = process.env.AUTH_EMAIL_DOMAIN || "gmail.com";
  return {
    email: `lobb.phone.${localPart}@${domain}`,
    password,
  };
}

export async function POST(request: Request) {
  if (!isDevLoginEnabled()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role: DevRole = body.role === "coach" ? "coach" : body.role === "admin" ? "admin" : "player";
  const phone = DEV_PHONES[role];
  const { email, password } = getSyntheticCredentials(phone);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = createAdminClient();

  let signIn = await authClient.auth.signInWithPassword({ email, password });

  if (signIn.error) {
    // First time: create the Supabase user and seed a production-like profile.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone, requested_role: role },
    });
    if (createErr || !created.user) {
      return NextResponse.json({ error: createErr?.message ?? "Could not create test user" }, { status: 500 });
    }

    await seedDevAccount(admin, created.user.id, phone, role);

    signIn = await authClient.auth.signInWithPassword({ email, password });
  }

  if (signIn.data.user) {
    await seedDevAccount(admin, signIn.data.user.id, phone, role);
  }

  if (signIn.error || !signIn.data.session) {
    return NextResponse.json({ error: signIn.error?.message ?? "Sign-in failed" }, { status: 500 });
  }

  return NextResponse.json({ session: signIn.data.session, user: signIn.data.user, role, phone });
}
