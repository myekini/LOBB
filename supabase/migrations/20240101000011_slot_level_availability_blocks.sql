-- Allow coaches to block one concrete session slot without closing the whole day.

create table if not exists public.coach_availability_slot_blocks (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  slot_starts_at timestamptz not null,
  slot_ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint coach_availability_slot_blocks_valid_time check (slot_starts_at < slot_ends_at),
  constraint coach_availability_slot_blocks_unique unique(coach_id, slot_starts_at)
);

create index if not exists coach_availability_slot_blocks_lookup_idx
  on public.coach_availability_slot_blocks(coach_id, slot_starts_at, slot_ends_at);

alter table public.coach_availability_slot_blocks enable row level security;

drop policy if exists "Coach slot blocks readable for active coaches" on public.coach_availability_slot_blocks;
create policy "Coach slot blocks readable for active coaches"
on public.coach_availability_slot_blocks for select
using (
  exists (
    select 1 from public.coaches
    where coaches.id = coach_availability_slot_blocks.coach_id
      and coaches.status = 'active'
  )
);

drop policy if exists "Coaches manage their availability slot blocks" on public.coach_availability_slot_blocks;
create policy "Coaches manage their availability slot blocks"
on public.coach_availability_slot_blocks for all
to authenticated
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

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
  ),
  day_windows as (
    select
      (d.d + avail.starts_at)::timestamptz as win_start,
      (d.d + avail.ends_at)::timestamptz as win_end
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
  )
  select
    s as slot_starts_at,
    s + interval '60 minutes' as slot_ends_at
  from raw_slots
  where not exists (
    select 1 from public.coach_availability_blocks bl
    where bl.coach_id = p_coach_id
      and bl.blocked_date = s::date
  )
  and not exists (
    select 1 from public.coach_availability_slot_blocks sb
    where sb.coach_id = p_coach_id
      and s < sb.slot_ends_at
      and s + interval '60 minutes' > sb.slot_starts_at
  )
  and not exists (
    select 1 from public.bookings bk
    where bk.coach_id = p_coach_id
      and bk.status in ('pending', 'confirmed')
      and s <  bk.ends_at   + interval '15 minutes'
      and s + interval '60 minutes' > bk.starts_at - interval '15 minutes'
  )
  order by s;
$$;
