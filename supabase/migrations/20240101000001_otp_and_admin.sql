-- OTP verifications table (replaces in-memory store — survives deploys/restarts)
create table if not exists public.otp_verifications (
  phone_number text primary key,
  code_hash    text not null,
  role         public.user_role not null default 'player',
  attempts     smallint not null default 0,
  -- Unix ms timestamps of recent send requests (for rate-limiting)
  request_timestamps bigint[] not null default array[]::bigint[],
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- All access goes through the service-role key in API routes.
-- No authenticated or anon policies = zero direct client access.
alter table public.otp_verifications enable row level security;

drop trigger if exists set_otp_verifications_updated_at on public.otp_verifications;
create trigger set_otp_verifications_updated_at
  before update on public.otp_verifications
  for each row execute function public.set_updated_at();

-- Cleanup helper called on every OTP create (best-effort, removes stale rows)
create or replace function public.cleanup_expired_otps()
returns void language sql security definer set search_path = public as $$
  delete from public.otp_verifications
  where expires_at < now() - interval '1 hour';
$$;

-- ─── User media bucket (player profile photos) ───────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "User media is publicly readable" on storage.objects;
create policy "User media is publicly readable"
on storage.objects for select
using (bucket_id = 'user-media');

drop policy if exists "Users upload their own user media" on storage.objects;
create policy "Users upload their own user media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update their own user media" on storage.objects;
create policy "Users update their own user media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'user-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── Admin RLS bypass policies ────────────────────────────────────────────────
-- Without these, the admin dashboard can't read platform-wide data.
-- All checks use a subquery so we don't need a separate auth.jwt() claim.

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
on public.profiles for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins read all coaches" on public.coaches;
create policy "Admins read all coaches"
on public.coaches for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins manage coach status" on public.coaches;
create policy "Admins manage coach status"
on public.coaches for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins read all bookings" on public.bookings;
create policy "Admins read all bookings"
on public.bookings for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins update bookings" on public.bookings;
create policy "Admins update bookings"
on public.bookings for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins read all payments" on public.payments;
create policy "Admins read all payments"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
