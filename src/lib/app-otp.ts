import { createHash, randomInt } from "crypto";

type OtpRecord = {
  codeHash: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
  requests: number[];
  role: "player" | "coach";
};

const otpTtlMs = 10 * 60 * 1000;
const requestWindowMs = 60 * 60 * 1000;
const maxRequestsPerWindow = 3;
const maxAttempts = 5;
const fallbackTestOtp = "000000";

const store = globalThis as typeof globalThis & {
  __lobbOtpStore?: Map<string, OtpRecord>;
};

const otpStore = store.__lobbOtpStore ?? new Map<string, OtpRecord>();
store.__lobbOtpStore = otpStore;

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function getTestOtp() {
  const configuredCode = process.env.LOBB_TEST_OTP?.replace(/\D/g, "").slice(0, 6);
  return configuredCode && configuredCode.length === 6 ? configuredCode : fallbackTestOtp;
}

export function isTestOtpEnabled() {
  if (process.env.LOBB_ENABLE_TEST_OTP === "true") {
    return true;
  }

  if (process.env.LOBB_ENABLE_TEST_OTP === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

export function createOtp(phone: string, role: "player" | "coach") {
  const now = Date.now();
  const existing = otpStore.get(phone);
  const recentRequests = (existing?.requests ?? []).filter(
    (timestamp) => now - timestamp < requestWindowMs
  );

  if (recentRequests.length >= maxRequestsPerWindow) {
    const oldest = Math.min(...recentRequests);
    const retryAfterMs = requestWindowMs - (now - oldest);
    return {
      error: `Too many requests. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
    };
  }

  const code = isTestOtpEnabled()
    ? getTestOtp()
    : String(randomInt(0, 1_000_000)).padStart(6, "0");

  otpStore.set(phone, {
    codeHash: hashOtp(phone, code),
    expiresAt: now + otpTtlMs,
    sentAt: now,
    attempts: 0,
    requests: [...recentRequests, now],
    role,
  });

  return { code, expiresAt: now + otpTtlMs };
}

export function verifyOtp(phone: string, code: string) {
  const record = otpStore.get(phone);

  if (!record && isTestOtpEnabled() && code === getTestOtp()) {
    return { ok: true as const, role: "player" as const };
  }

  if (!record) {
    return { ok: false as const, error: "Code expired. Request a new one." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return { ok: false as const, error: "Code expired. Request a new one." };
  }

  if (record.attempts >= maxAttempts) {
    otpStore.delete(phone);
    return { ok: false as const, error: "Too many wrong attempts. Request a new code." };
  }

  const isValidTestOtp = isTestOtpEnabled() && code === getTestOtp();

  if (!isValidTestOtp && record.codeHash !== hashOtp(phone, code)) {
    record.attempts += 1;
    return { ok: false as const, error: "Wrong code. Try again." };
  }

  otpStore.delete(phone);
  return { ok: true as const, role: record.role };
}
