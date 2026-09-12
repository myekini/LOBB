// Cloudflare Turnstile — bot protection on the signup OTP request.
//
// When TURNSTILE_SECRET_KEY is unset (local dev, or before the key is
// provisioned) verification is skipped so the flow still works. In production,
// set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY to enforce it.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verify a Turnstile token. Returns true when Turnstile is not configured
 * (fail-open by design — see module note), or when the token is valid.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    // Without a timeout, a slow/hanging Cloudflare response ties up the whole
    // signup request for as long as the serverless function allows.
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
    return Boolean(payload?.success);
  } catch {
    // Network error reaching Cloudflare — don't lock legitimate users out.
    return true;
  }
}
