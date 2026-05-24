import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { type DevRole, seedDevAccount } from "@/lib/dev-account-seed";

const FALLBACK_DEV_PHONE = "+2348164555012";

export async function POST(request: Request) {
  if (process.env.LOBB_ENABLE_DEV_LOGIN !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { role?: string };
  const role = body.role as DevRole;

  if (!role || !["player", "coach", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Create a server client to check the current session
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const phone = user.user_metadata?.phone || user.phone || FALLBACK_DEV_PHONE;

  // Seed and update the user's role
  await seedDevAccount(adminClient, user.id, phone, role);

  return NextResponse.json({ success: true, role, redirectUrl: role === "coach" ? "/coach/dashboard" : role === "admin" ? "/admin" : "/" });
}
