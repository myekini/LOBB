import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const OTP_TTL_MS = 10 * 60 * 1000;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 3;
const MAX_ATTEMPTS = 5;
type OtpRole = "player" | "coach" | "admin";

function hashOtp(identifier: string, code: string) {
  return createHash("sha256").update(`${identifier}:${code}`).digest("hex");
}

export async function createOtp(identifier: string, role: OtpRole) {
  const supabase = createAdminClient();
  const now = Date.now();
  const windowStart = now - REQUEST_WINDOW_MS;

  void supabase.rpc("cleanup_expired_otps");

  const { data: existing } = await supabase
    .from("otp_verifications")
    .select("request_timestamps")
    .eq("phone_number", identifier)
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

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const { error } = await supabase.from("otp_verifications").upsert(
    {
      phone_number: identifier,
      code_hash: hashOtp(identifier, code),
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

/**
 * Validates the OTP code without consuming (deleting) the record.
 * Call consumeOtp() after auth succeeds to prevent a failed session creation
 * from locking the user out.
 */
export async function verifyOtp(identifier: string, code: string) {
  const supabase = createAdminClient();

  const { data: record } = await supabase
    .from("otp_verifications")
    .select("*")
    .eq("phone_number", identifier)
    .maybeSingle();

  if (!record) {
    return { ok: false as const, error: "Code not found. Request a new one." };
  }

  if (new Date(record.expires_at as string).getTime() < Date.now()) {
    void supabase.from("otp_verifications").delete().eq("phone_number", identifier);
    return { ok: false as const, error: "Code expired. Request a new one." };
  }

  if ((record.attempts as number) >= MAX_ATTEMPTS) {
    void supabase.from("otp_verifications").delete().eq("phone_number", identifier);
    return { ok: false as const, error: "Too many wrong attempts. Request a new code." };
  }

  if (record.code_hash !== hashOtp(identifier, code)) {
    await supabase
      .from("otp_verifications")
      .update({ attempts: (record.attempts as number) + 1 })
      .eq("phone_number", identifier);
    return { ok: false as const, error: "Wrong code. Try again." };
  }

  return { ok: true as const, role: record.role as OtpRole };
}

/** Deletes the OTP record after successful auth. Call once session is confirmed. */
export async function consumeOtp(identifier: string) {
  const supabase = createAdminClient();
  void supabase.from("otp_verifications").delete().eq("phone_number", identifier);
}
