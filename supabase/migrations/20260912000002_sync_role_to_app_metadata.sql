-- Scale fix: app_metadata.role was never actually populated.
--
-- src/lib/supabase/middleware.ts, src/lib/api-auth.ts and src/app/page.tsx
-- all read `user.app_metadata?.role` as a fast path, falling back to a
-- `select role from profiles` query when it's missing. That fallback was
-- firing on every single request, for every user, because nothing ever
-- wrote to app_metadata -- the existing custom_access_token_hook (see
-- 20260624000002_functions.sql) writes a `user_role` claim directly into
-- the JWT payload, which is a different mechanism entirely from
-- app_metadata (sourced from auth.users.raw_app_meta_data) and isn't what
-- supabase.auth.getUser() surfaces as `.app_metadata`.
--
-- Fix: keep auth.users.raw_app_meta_data.role in sync via a trigger on
-- public.profiles, so the JWT-role fast path the app already reads from
-- actually works. This removes a DB round trip from every protected-route
-- request in middleware once a user's session next refreshes.

create or replace function public.sync_role_to_auth_metadata()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role::text)
  where id = new.id;
  return new;
exception when others then
  -- Never block a profile write over this -- worst case, the request falls
  -- back to the DB-query path exactly like before this migration.
  raise warning 'sync_role_to_auth_metadata failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_profile_role_change on public.profiles;
create trigger on_profile_role_change
  after insert or update of role on public.profiles
  for each row execute function public.sync_role_to_auth_metadata();

-- Backfill every existing user so this takes effect immediately, not only
-- on the next role change (which for most users is never).
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
from public.profiles p
where p.id = u.id
  and coalesce(u.raw_app_meta_data->>'role', '') is distinct from p.role::text;
