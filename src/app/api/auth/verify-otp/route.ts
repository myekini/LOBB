import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consumeOtp, verifyOtp } from "@/lib/db-otp";
import { formatNigerianPhoneNumber } from "@/lib/phone";
import { normalizeEmail } from "@/lib/email";
import { getSupabaseServerKey } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseServerKey();
  if (!url || !key) throw new Error("Supabase is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getSyntheticCredentials(identifier: string) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is not set. Cannot issue sessions.");
  }
  const password = createHmac("sha256", secret).update(`lobb:${identifier}`).digest("base64url");

  // Email-based auth: use the real email directly as Supabase identity
  if (identifier.includes("@")) {
    return { email: identifier, password, isEmailAuth: true };
  }

  // Phone-based auth (legacy dev path): synthetic email
  const localPart = identifier.replace(/\D/g, "");
  const domain = process.env.AUTH_EMAIL_DOMAIN || "gmail.com";
  return { email: `lobb.phone.${localPart}@${domain}`, password, isEmailAuth: false };
}

export async function POST(request: Request) {
  const rl = rateLimit(`verify-otp:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      phone?: string;
      code?: string;
      otp?: string;
      role?: "player" | "coach" | "admin";
    };

    const requestedCode = body.code ?? body.otp;
    if (!requestedCode) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const code = requestedCode.replace(/\D/g, "");
    if (code.length !== 6) {
      return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
    }

    // Resolve the OTP identifier — email takes precedence over phone
    let identifier: string;
    if (body.email) {
      const email = normalizeEmail(body.email);
      if (!email) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      identifier = email;
    } else if (body.phone) {
      identifier = formatNigerianPhoneNumber(body.phone);
    } else {
      return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
    }

    const otpResult = await verifyOtp(identifier, code);
    if (!otpResult.ok) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 });
    }

    const authClient = getAuthClient();
    const adminClient = getAdminClient();
    const { email: authEmail, password, isEmailAuth } = getSyntheticCredentials(identifier);

    let signIn = await authClient.auth.signInWithPassword({ email: authEmail, password });
    let session = signIn.data.session;
    let user = signIn.data.user;

    if (signIn.error && adminClient) {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password,
        // Only attach phone to Supabase user for phone-based auth
        ...(isEmailAuth ? {} : { phone: identifier }),
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          ...(isEmailAuth ? { email: identifier } : { phone: identifier }),
          requested_role: otpResult.role,
        },
      });

      if (!createError && created?.user) {
        // Brand-new user — stamp role if non-player so DB triggers don't default it.
        if (otpResult.role && otpResult.role !== "player") {
          await adminClient
            .from("profiles")
            .upsert(
              {
                id: created.user.id,
                role: otpResult.role,
                ...(isEmailAuth ? { email: identifier } : { phone_number: identifier }),
              },
              { onConflict: "id" }
            );
        }

        // Referral attribution: read first-touch cookie and store on the new profile
        const cookieHeader = request.headers.get("cookie") ?? "";
        const refMatch = cookieHeader.split(";").find((c) => c.trim().startsWith("lobb_ref="));
        const refCode = refMatch ? refMatch.split("=")[1]?.trim() : null;
        if (refCode) {
          const { data: referringCoach } = await adminClient
            .from("coaches")
            .select("id")
            .eq("referral_code", refCode)
            .eq("status", "active")
            .maybeSingle();
          if (referringCoach) {
            await adminClient
              .from("profiles")
              .update({ referred_by_coach_id: referringCoach.id, referred_at: new Date().toISOString() })
              .eq("id", created.user.id);
          }
        }
      } else {
        // User already exists in Supabase Auth (e.g. signed up before, or HMAC secret
        // changed between deployments). Reset their password to the current HMAC value
        // so the subsequent signInWithPassword succeeds.
        const profileCol = isEmailAuth ? "email" : "phone_number";
        const { data: profileRow } = await adminClient
          .from("profiles")
          .select("id")
          .eq(profileCol, identifier)
          .maybeSingle();

        if (profileRow?.id) {
          await adminClient.auth.admin.updateUserById(profileRow.id, { password });
        } else {
          // Profile row missing — look up the auth user directly by email.
          // Uses .schema('auth') to avoid the listUsers({ perPage: 1000 }) full scan.
          const { data: authUser } = await adminClient
            .schema("auth")
            .from("users")
            .select("id")
            .eq("email", authEmail)
            .maybeSingle();
          if (authUser?.id) {
            await adminClient.auth.admin.updateUserById(authUser.id, { password });
          }
        }
      }

      signIn = await authClient.auth.signInWithPassword({ email: authEmail, password });
      session = signIn.data.session;
      user = signIn.data.user;
    }

    if (signIn.error || !session || !user) {
      return NextResponse.json(
        { error: signIn.error?.message ?? "Could not start your session. Please try again." },
        { status: 500 }
      );
    }

    // Only consume (delete) the OTP record once we have a confirmed session —
    // if we deleted it before this point a failed signIn would lock the user out.
    await consumeOtp(identifier);

    return NextResponse.json({
      session,
      user,
      ...(isEmailAuth ? { email: identifier } : { phone: identifier }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify OTP" },
      { status: 500 }
    );
  }
}
