-- National Stadium granola: track which court a booking occupies.
-- Adds location_court_id to bookings and a court_slot_bookings table
-- to prevent double-booking at the court level and enforce 1-hr slot rules.
-- Only covers National Stadium for now; extensible to any venue.

alter table public.bookings
  add column if not exists location_venue_id  text,
  add column if not exists location_court_id  text;

create table if not exists public.court_slot_bookings (
  id               uuid        primary key default gen_random_uuid(),
  court_id         text        not null,  -- e.g. 'nat_main_1', 'nat_front_2'
  venue_id         text        not null,  -- e.g. 'national_stadium'
  booking_id       uuid        references public.bookings(id) on delete cascade,
  coach_id         uuid        not null   references public.coaches(id) on delete cascade,
  player_id        uuid        not null   references public.profiles(id) on delete cascade,
  slot_starts_at   timestamptz not null,
  slot_ends_at     timestamptz not null,
  created_at       timestamptz not null   default now(),

  -- Each court can only have one booking per starting slot
  constraint court_slot_unique unique (court_id, slot_starts_at)
);

create index if not exists court_slot_bookings_venue_time_idx
  on public.court_slot_bookings (venue_id, slot_starts_at, slot_ends_at);

create index if not exists court_slot_bookings_booking_idx
  on public.court_slot_bookings (booking_id);

alter table public.court_slot_bookings enable row level security;

-- Coaches can see their own court bookings; players can see bookings for their bookings
create policy "Users see their own court bookings"
  on public.court_slot_bookings for select
  to authenticated
  using (
    coach_id = auth.uid()
    or player_id = auth.uid()
  );

-- Only service role (admin client) can insert / update / delete
create policy "Service role manages court bookings"
  on public.court_slot_bookings for all
  to service_role
  using (true)
  with check (true);
