import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// PUBLIC ROUTE — no authentication required (this is how you authenticate)

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }

    // Brute-force protection: per IP and per email.
    const ip = clientIp(request);
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit(`login-pw:ip:${ip}`, 20, 10 * 60 * 1000),
      rateLimit(`login-pw:email:${email}`, 8, 10 * 60 * 1000),
    ]);
    if (!ipLimit.ok || !emailLimit.ok) {
      const retry = Math.max(ipLimit.retryAfterSecs, emailLimit.retryAfterSecs);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${retry}s.` },
        { status: 429, headers: { "Retry-After": String(retry) } },
      );
    }

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session || !data.user) {
      // Generic message — never reveal whether the email exists or which field was wrong.
      return NextResponse.json(
        { error: "Wrong email or password.", code: "invalid_credentials" },
        { status: 401 },
      );
    }

    return NextResponse.json({ session: data.session, user: data.user, email });
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Try again." }, { status: 500 });
  }
}
