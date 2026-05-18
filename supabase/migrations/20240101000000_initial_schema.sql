-- LOBB marketplace schema
-- Supabase Auth owns auth.users. Public tables model marketplace state.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('player', 'coach', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.coach_status as enum ('draft', 'pending_review', 'active', 'paused', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'disputed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone_number text unique,
  role public.user_role not null default 'player',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coaches (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  bio text not null,
  headline text,
  hourly_rate_ngn integer not null check (hourly_rate_ngn >= 1000),
  experience_years integer not null default 0 check (experience_years >= 0),
  primary_location text not null,
  service_areas text[] not null default array[]::text[],
  skill_levels text[] not null default array[]::text[],
  certifications text[] not null default array[]::text[],
  demo_video_url text,
  profile_photo_url text,
  paystack_subaccount_code text,
  status public.coach_status not null default 'pending_review',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null,
  skill_level text,
  preferred_locations text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_availability_valid_time check (starts_at < ends_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id),
  player_id uuid not null references public.players(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,
  status public.booking_status not null default 'pending',
  hourly_rate_ngn integer not null check (hourly_rate_ngn >= 0),
  platform_fee_ngn integer not null default 0 check (platform_fee_ngn >= 0),
  total_amount_ngn integer not null check (total_amount_ngn >= 0),
  player_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_valid_time check (starts_at < ends_at)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  paystack_reference text not null unique,
  paystack_access_code text,
  paystack_transfer_code text,
  status public.payment_status not null default 'pending',
  amount_ngn integer not null check (amount_ngn >= 0),
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coaches_status_idx on public.coaches(status);
create index if not exists coaches_primary_location_idx on public.coaches(primary_location);
create index if not exists bookings_coach_starts_at_idx on public.bookings(coach_id, starts_at);
create index if not exists bookings_player_starts_at_idx on public.bookings(player_id, starts_at);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_coaches_updated_at on public.coaches;
create trigger set_coaches_updated_at before update on public.coaches
for each row execute function public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists set_coach_availability_updated_at on public.coach_availability;
create trigger set_coach_availability_updated_at before update on public.coach_availability
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_number, full_name)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do update set
    phone_number = excluded.phone_number,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.players enable row level security;
alter table public.coach_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Profiles are visible to signed-in users" on public.profiles;
create policy "Profiles are visible to signed-in users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
on public.profiles for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Active coaches are public" on public.coaches;
create policy "Active coaches are public"
on public.coaches for select
using (status = 'active' or auth.uid() = id);

drop policy if exists "Users manage their own coach profile" on public.coaches;
create policy "Users manage their own coach profile"
on public.coaches for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users manage their own player profile" on public.players;
create policy "Users manage their own player profile"
on public.players for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Coach availability is public for active coaches" on public.coach_availability;
create policy "Coach availability is public for active coaches"
on public.coach_availability for select
using (
  exists (
    select 1 from public.coaches
    where coaches.id = coach_availability.coach_id
      and (coaches.status = 'active' or coaches.id = auth.uid())
  )
);

drop policy if exists "Coaches manage their availability" on public.coach_availability;
create policy "Coaches manage their availability"
on public.coach_availability for all
to authenticated
using (auth.uid() = coach_id)
with check (auth.uid() = coach_id);

drop policy if exists "Booking participants can read bookings" on public.bookings;
create policy "Booking participants can read bookings"
on public.bookings for select
to authenticated
using (auth.uid() = coach_id or auth.uid() = player_id);

drop policy if exists "Players create their bookings" on public.bookings;
create policy "Players create their bookings"
on public.bookings for insert
to authenticated
with check (auth.uid() = player_id);

drop policy if exists "Booking participants update bookings" on public.bookings;
create policy "Booking participants update bookings"
on public.bookings for update
to authenticated
using (auth.uid() = coach_id or auth.uid() = player_id);

drop policy if exists "Booking participants can read payments" on public.payments;
create policy "Booking participants can read payments"
on public.payments for select
to authenticated
using (
  exists (
    select 1 from public.bookings
    where bookings.id = payments.booking_id
      and (bookings.coach_id = auth.uid() or bookings.player_id = auth.uid())
  )
);

drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public"
on public.reviews for select
using (true);

drop policy if exists "Players review completed bookings" on public.reviews;
create policy "Players review completed bookings"
on public.reviews for insert
to authenticated
with check (
  auth.uid() = player_id
  and exists (
    select 1 from public.bookings
    where bookings.id = reviews.booking_id
      and bookings.player_id = auth.uid()
      and bookings.status = 'completed'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-media',
  'coach-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coach media is publicly readable" on storage.objects;
create policy "Coach media is publicly readable"
on storage.objects for select
using (bucket_id = 'coach-media');

drop policy if exists "Users upload their own coach media" on storage.objects;
create policy "Users upload their own coach media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'coach-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update their own coach media" on storage.objects;
create policy "Users update their own coach media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'coach-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
