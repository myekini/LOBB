import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 3;
const MAX_ATTEMPTS = 5;
const FALLBACK_TEST_OTP = "000000";
const FALLBACK_TEST_PHONES = ["+2348164555012", "+2340000000001", "+2340000000002"];
type OtpRole = "player" | "coach" | "admin";

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function getTestOtp() {
  const configured = process.env.LOBB_TEST_OTP?.replace(/\D/g, "").slice(0, 6);
  return configured?.length === 6 ? configured : FALLBACK_TEST_OTP;
}

export function isTestOtpEnabled() {
  // Explicit opt-in only — never falls back to NODE_ENV so a missing env var
  // in production doesn't silently leave 000000 working for real users.
  return process.env.LOBB_ENABLE_TEST_OTP === "true";
}

export function getTestPhones() {
  return (process.env.LOBB_TEST_PHONE_NUMBERS ?? FALLBACK_TEST_PHONES.join(","))
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);
}

export function isTestPhone(phone: string) {
  return getTestPhones().includes(phone);
}

export function shouldUseTestOtp(phone: string) {
  return isTestOtpEnabled() && isTestPhone(phone);
}

export async function createOtp(phone: string, role: OtpRole) {
  const supabase = createAdminClient();
  const now = Date.now();
  const windowStart = now - REQUEST_WINDOW_MS;

  // Best-effort cleanup of stale rows on every create
  void supabase.rpc("cleanup_expired_otps");

  const { data: existing } = await supabase
    .from("otp_verifications")
    .select("request_timestamps")
    .eq("phone_number", phone)
    .maybeSingle();

  const recentRequests = ((existing?.request_timestamps ?? []) as number[]).filter(
    (ts) => ts > windowStart
  );

  if (recentRequests.length >= MAX_REQUESTS) {
    const oldest = Math.min(...recentRequests);
    const retryAfterMs = REQUEST_WINDOW_MS - (now - oldest);
    return {
      error: `Too many requests. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
    };
  }

  const code = shouldUseTestOtp(phone)
    ? getTestOtp()
    : String(randomInt(0, 1_000_000)).padStart(6, "0");

  const { error } = await supabase.from("otp_verifications").upsert(
    {
      phone_number: phone,
      code_hash: hashOtp(phone, code),
      role,
      attempts: 0,
      request_timestamps: [...recentRequests, now],
      expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone_number" }
  );

  if (error) {
    return { error: "Could not generate code. Please try again." };
  }

  return { code, expiresAt: now + OTP_TTL_MS };
}

export async function verifyOtp(phone: string, code: string) {
  const supabase = createAdminClient();

  // Test OTP shortcut — valid only for explicitly configured dev phones.
  if (shouldUseTestOtp(phone) && code === getTestOtp()) {
    const { data } = await supabase
      .from("otp_verifications")
      .select("role")
      .eq("phone_number", phone)
      .maybeSingle();

    await supabase.from("otp_verifications").delete().eq("phone_number", phone);
    return { ok: true as const, role: ((data?.role as string) ?? "player") as OtpRole };
  }

  const { data: record } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

  if (!record) {
    return { ok: false as const, error: "Code expired. Request a new one." };
  }

  if (new Date(record.expires_at as string).getTime() < now()) {
    await supabase.from("otp_verifications").delete().eq("phone_number", phone);
    return { ok: false as const, error: "Code expired. Request a new one." };
  }

  if ((record.attempts as number) >= MAX_ATTEMPTS) {
    await supabase.from("otp_verifications").delete().eq("phone_number", phone);
    return { ok: false as const, error: "Too many wrong attempts. Request a new code." };
  }

  if (record.code_hash !== hashOtp(phone, code)) {
    await supabase
      .from("otp_verifications")
      .update({ attempts: (record.attempts as number) + 1 })
      .eq("phone_number", phone);
    return { ok: false as const, error: "Wrong code. Try again." };
  }

  await supabase.from("otp_verifications").delete().eq("phone_number", phone);
  return { ok: true as const, role: record.role as OtpRole };
}

function now() {
  return Date.now();
}
