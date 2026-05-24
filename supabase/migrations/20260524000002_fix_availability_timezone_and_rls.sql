-- Fix 1: interpret coach availability times as Africa/Lagos (WAT +01:00), not UTC.
--   Previously, a coach setting "09:00" would surface as 10:00 WAT to players because
--   the function ran in a UTC session. Adding `set timezone = 'Africa/Lagos'` makes the
--   (date + time)::timestamptz cast treat stored times as Lagos local time.
--
-- Fix 2: include 'pending_payment' bookings in the slot-conflict check so that a
--   booking whose payment webhook hasn't fired yet still blocks the slot.
--
-- Fix 3: enable RLS on coach_availability (was missing from the initial schema).
--   API routes use the service-role client and are unaffected; the RPC is security
--   definer and is also unaffected.  This closes direct-table access for anon/auth roles.

-- ─── Rewrite the slot-generation function ────────────────────────────────────

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
set timezone = 'Africa/Lagos'
as $$
  with
  dates as (
    select d::date as d
    from generate_series(
      p_from_date::timestamptz,
      p_to_date::timestamptz,
      '1 day'::interval
    ) d
  ),
  avail as (
    select day_of_week, starts_at, ends_at
    from public.coach_availability
    where coach_id = p_coach_id
      and coalesce(is_active, true) = true
  ),
  day_windows as (
    select
      (d.d + avail.starts_at)::timestamptz as win_start,
      (d.d + avail.ends_at)::timestamptz   as win_end
    from dates d
    join avail on extract(dow from d.d)::smallint = avail.day_of_week
    where (d.d + avail.starts_at) > now() + interval '24 hours'
  ),
  raw_slots as (
    select
      generate_series(
        dw.win_start,
        dw.win_end - interval '60 minutes',
        interval '60 minutes'
      ) as s
    from day_windows dw
  ),
  filtered_slots as (
    select distinct
      s                          as slot_starts_at,
      s + interval '60 minutes'  as slot_ends_at
    from raw_slots
    where
      -- exclude full-day blocks
      not exists (
        select 1 from public.coach_availability_blocks bl
        where bl.coach_id = p_coach_id
          and bl.blocked_date = s::date
      )
      -- exclude granular slot blocks
      and not exists (
        select 1 from public.coach_availability_slot_blocks sb
        where sb.coach_id = p_coach_id
          and s < sb.slot_ends_at
          and s + interval '60 minutes' > sb.slot_starts_at
      )
      -- exclude slots that conflict with existing bookings (±15-min buffer)
      -- includes pending_payment so an unconfirmed checkout still blocks the slot
      and not exists (
        select 1 from public.bookings bk
        where bk.coach_id = p_coach_id
          and bk.status in ('pending', 'pending_payment', 'confirmed')
          and s < bk.ends_at   + interval '15 minutes'
          and s + interval '60 minutes' > bk.starts_at - interval '15 minutes'
      )
  )
  select slot_starts_at, slot_ends_at
  from filtered_slots
  order by slot_starts_at;
$$;

-- ─── RLS on coach_availability ────────────────────────────────────────────────

alter table public.coach_availability enable row level security;

-- Service-role / security-definer functions bypass RLS; these policies apply to
-- direct authenticated-role table access only.

drop policy if exists "Active coaches and owners can read availability" on public.coach_availability;
create policy "Active coaches and owners can read availability"
on public.coach_availability for select
using (
  coach_id = auth.uid()
  or exists (
    select 1 from public.coaches
    where coaches.id = coach_availability.coach_id
      and coaches.status = 'active'
  )
);

drop policy if exists "Coaches manage their own availability" on public.coach_availability;
create policy "Coaches manage their own availability"
on public.coach_availability for all
to authenticated
using  (coach_id = auth.uid())
with check (coach_id = auth.uid());
