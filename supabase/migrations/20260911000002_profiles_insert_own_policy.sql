-- profiles had no INSERT policy at all — only SELECT (own), UPDATE (own), and
-- admin-all. It relied entirely on handle_new_user() pre-creating the row at
-- signup. That trigger deliberately swallows its own failures (exception
-- when others -> raise warning -> return new, so a broken profiles insert
-- never blocks auth signup itself) and its one-time backfill
-- (20260712000001_fix_handle_new_user_coach.sql) only repaired rows that
-- were already broken at the time it ran — not future trigger misses.
--
-- Player onboarding (src/app/(auth)/auth/setup/player/page.tsx) is the one
-- flow that upserts public.profiles straight from the browser under the
-- user's own session (coach onboarding goes through an API route on the
-- service role, which bypasses RLS entirely). If the trigger silently missed
-- creating that row, the client-side upsert's INSERT branch had zero
-- matching policy to fall back on: "new row violates row-level security
-- policy for table profiles".
--
-- This lets a user create only their own row (id = auth.uid()) — the same
-- trust boundary "profiles: own update" already grants, just extended to
-- INSERT so the signup trigger has a real fallback instead of a silent dead
-- end.

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());
