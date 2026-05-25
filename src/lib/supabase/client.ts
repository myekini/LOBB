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

  return createBrowserClient(
    url,
    key
  );
}
