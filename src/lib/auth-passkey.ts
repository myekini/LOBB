"use client";

import { createClient } from "@/lib/supabase/client";

/** Passkey UI is behind a flag until the Supabase provider is enabled in prod. */
export function passkeysEnabled() {
  return process.env.NEXT_PUBLIC_LOBB_ENABLE_PASSKEYS === "true";
}

/** Whether this browser can do WebAuthn at all. */
export function browserSupportsPasskeys() {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.credentials?.get === "function"
  );
}

/** Best-effort check for a platform authenticator (Face ID / Touch ID / Windows Hello). */
export async function hasPlatformAuthenticator() {
  if (!browserSupportsPasskeys()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

type PasskeyResult = { session: unknown; user: { id: string } | null };

/** Primary sign-in with a passkey. Session is persisted by the browser client. */
export async function signInWithPasskey(captchaToken?: string): Promise<PasskeyResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPasskey(
    captchaToken ? { options: { captchaToken } } : undefined,
  );
  if (error || !data?.user) throw error ?? new Error("Passkey sign-in failed");
  return { session: data.session, user: data.user };
}

/** Register a passkey for the currently signed-in user. */
export async function registerPasskey(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.registerPasskey();
  if (error) throw error;
}

/** Human-readable message for a WebAuthn/passkey failure. */
export function passkeyErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  const message = (err as { message?: string })?.message ?? "";
  if (name === "NotAllowedError" || /timed out|not allowed/i.test(message)) {
    return "Passkey prompt was dismissed. Try again or use your password.";
  }
  if (/no (credentials|passkey)/i.test(message)) {
    return "No passkey found on this device. Use your password instead.";
  }
  return "Could not sign in with a passkey. Use your password instead.";
}
