import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseBrowserKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseBrowserKey();

  if (!url || !key) {
    throw new Error("LOBB sign in is temporarily unavailable. Please try again after the latest deployment finishes.");
  }

  return createBrowserClient(url, key, {
    auth: {
      // Persist + auto-refresh the Supabase session so returning users stay
      // signed in for the life of the refresh token (set expiry to 60–90 days
      // in the Supabase dashboard). OTP is a one-time signup cost — it should
      // never fire again on a normal login.
      persistSession: true,
      autoRefreshToken: true,
      // Enables auth.signInWithPasskey() / auth.registerPasskey().
      // Also requires the WebAuthn/passkey provider to be enabled in the
      // Supabase dashboard (Authentication → Providers).
      experimental: { passkey: true },
    },
  });
}
