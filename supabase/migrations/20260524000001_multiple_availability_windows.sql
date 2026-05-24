-- Multiple weekly availability windows per day.
-- The table already supports multiple rows; this migration tightens slot generation
-- so only active rows are used and overlapping windows do not return duplicate slots.

create or replace function public.get_coach_available_slots(
  p_coach_id uuid,
  p_from_date date default current_date,
  p_to_date date default (current_date + 14)
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
      and coalesce(is_active, true) = true
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
  ),
  filtered_slots as (
    select distinct
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
        and s < bk.ends_at + interval '15 minutes'
        and s + interval '60 minutes' > bk.starts_at - interval '15 minutes'
    )
  )
  select slot_starts_at, slot_ends_at
  from filtered_slots
  order by slot_starts_at;
$$;
