-- 2.3 Availability & Scheduling

-- ─── Block-off dates ─────────────────────────────────────────────────────────
create table if not exists public.coach_availability_blocks (
  id           uuid    primary key default gen_random_uuid(),
  coach_id     uuid    not null references public.coaches(id) on delete cascade,
  blocked_date date    not null,
  reason       text,
  created_at   timestamptz not null default now(),
  constraint coach_availability_blocks_unique unique(coach_id, blocked_date)
);

create index if not exists coach_avail_blocks_coach_date_idx
  on public.coach_availability_blocks(coach_id, blocked_date);

alter table public.coach_availability_blocks enable row level security;

drop policy if exists "Coach blocks readable for active coaches" on public.coach_availability_blocks;
create policy "Coach blocks readable for active coaches"
on public.coach_availability_blocks for select
using (
  exists (
    select 1 from public.coaches
    where coaches.id = coach_availability_blocks.coach_id
      and (coaches.status = 'active' or coaches.id = auth.uid())
  )
);

drop policy if exists "Coaches manage their availability blocks" on public.coach_availability_blocks;
create policy "Coaches manage their availability blocks"
on public.coach_availability_blocks for all
to authenticated
using  (auth.uid() = coach_id)
with check (auth.uid() = coach_id);

-- updated_at trigger
drop trigger if exists set_coach_avail_blocks_updated_at on public.coach_availability_blocks;

-- ─── Index on weekly availability for faster slot generation ─────────────────
create index if not exists coach_availability_coach_dow_idx
  on public.coach_availability(coach_id, day_of_week);

-- ─── Rebuild public view to add has_availability ──────────────────────────────
drop view if exists public.coach_profiles_public;
create or replace view public.coach_profiles_public as
select
  c.id,
  c.full_name,
  c.bio,
  c.headline,
  c.hourly_rate_ngn,
  c.experience_years,
  c.primary_location,
  c.service_areas,
  c.skill_levels,
  c.specializations,
  c.languages,
  c.certifications,
  c.court_access,
  c.demo_video_url,
  c.profile_photo_url,
  c.slug,
  c.status,
  c.is_verified,
  c.created_at,
  round(avg(r.rating)::numeric, 1)  as avg_rating,
  count(distinct r.id)::integer     as review_count,
  count(distinct b.id)::integer     as session_count,
  (count(distinct av.id) > 0)       as has_availability
from public.coaches c
left join public.reviews            r  on r.coach_id = c.id
left join public.bookings           b  on b.coach_id = c.id and b.status = 'completed'
left join public.coach_availability av on av.coach_id = c.id
group by c.id;

-- ─── Function: compute open 60-min slots for a coach ─────────────────────────
-- Returns slot_starts_at / slot_ends_at pairs for the requested date window.
-- Rules enforced:
--   • Slots must start > 24 h from now
--   • Slots must start <= 14 days from now (enforced by caller; p_to_date caps it)
--   • 60-minute fixed duration
--   • 15-minute buffer around existing confirmed/pending bookings
--   • Block-off dates are fully excluded
create or replace function public.get_coach_available_slots(
  p_coach_id  uuid,
  p_from_date date default current_date,
  p_to_date   date default (current_date + 14)
)
returns table(slot_starts_at timestamptz, slot_ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- One row per date in the window
  dates as (
    select d::date as d
    from generate_series(
      p_from_date::timestamptz,
      p_to_date::timestamptz,
      '1 day'::interval
    ) d
  ),
  -- Weekly availability for this coach
  avail as (
    select day_of_week, starts_at, ends_at
    from public.coach_availability
    where coach_id = p_coach_id
  ),
  -- Availability windows matched to concrete calendar dates
  day_windows as (
    select
      (d.d + avail.starts_at)::timestamptz as win_start,
      (d.d + avail.ends_at)::timestamptz   as win_end
    from dates d
    join avail on extract(dow from d.d)::smallint = avail.day_of_week
    -- Enforce minimum 24-hour advance booking window
    where (d.d + avail.starts_at) > now() + interval '24 hours'
  ),
  -- Generate one 60-min slot per step within each window
  raw_slots as (
    select
      generate_series(
        dw.win_start,
        dw.win_end - interval '60 minutes',
        interval '60 minutes'
      ) as s
    from day_windows dw
  )
  select
    s                           as slot_starts_at,
    s + interval '60 minutes'  as slot_ends_at
  from raw_slots
  -- Exclude block-off dates
  where not exists (
    select 1 from public.coach_availability_blocks bl
    where bl.coach_id = p_coach_id
      and bl.blocked_date = s::date
  )
  -- Exclude slots that overlap an existing booking (+ 15-min buffer on each side)
  and not exists (
    select 1 from public.bookings bk
    where bk.coach_id = p_coach_id
      and bk.status in ('pending', 'confirmed')
      and s <  bk.ends_at   + interval '15 minutes'
      and s + interval '60 minutes' > bk.starts_at - interval '15 minutes'
  )
  order by s;
$$;
