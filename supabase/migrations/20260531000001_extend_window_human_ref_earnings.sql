-- 1. Extend get_coach_available_slots to 30 days (was 14)
-- -------------------------------------------------------
create or replace function public.get_coach_available_slots(
  p_coach_id  uuid,
  p_from_date date default current_date,
  p_to_date   date default (current_date + 30)
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
      not exists (
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
          and bk.status in ('pending', 'pending_payment', 'confirmed')
          and s < bk.ends_at   + interval '15 minutes'
          and s + interval '60 minutes' > bk.starts_at - interval '15 minutes'
      )
      and not exists (
        select 1 from public.slot_locks sl
        where sl.coach_id = p_coach_id
          and sl.slot_starts_at = s
          and sl.expires_at > now()
      )
  )
  select slot_starts_at, slot_ends_at
  from filtered_slots
  order by slot_starts_at;
$$;


-- 2. Human-readable booking reference (e.g. LB-2605-A3F7)
-- ---------------------------------------------------------
alter table public.bookings
  add column if not exists human_ref text unique;

create or replace function public.generate_booking_ref()
returns text
language plpgsql volatile
as $$
declare
  ref      text;
  attempts int := 0;
begin
  loop
    ref := 'LB-'
      || to_char(now() at time zone 'Africa/Lagos', 'YYMM') || '-'
      || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    if not exists (select 1 from public.bookings where human_ref = ref) then
      return ref;
    end if;
    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'generate_booking_ref: could not generate unique ref';
    end if;
  end loop;
end;
$$;

create or replace function public.set_booking_human_ref()
returns trigger
language plpgsql
as $$
begin
  if new.human_ref is null then
    new.human_ref := public.generate_booking_ref();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_set_human_ref on public.bookings;
create trigger bookings_set_human_ref
  before insert on public.bookings
  for each row execute function public.set_booking_human_ref();


-- 3. Fix coach_earnings_summary: pending_payout_ngn should include
--    confirmed bookings (paid, awaiting session/payout), not only completed.
-- ---------------------------------------------------------------
drop view if exists public.coach_earnings_summary;
create or replace view public.coach_earnings_summary as
select
  c.id as coach_id,
  -- settled figures (completed + escrow released)
  coalesce(sum(case
    when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now())
    then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_this_week_ngn,
  coalesce(sum(case
    when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now())
    then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_week_ngn,
  coalesce(sum(case
    when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now())
    then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_this_month_ngn,
  coalesce(sum(case
    when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now())
    then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_month_ngn,
  coalesce(sum(case
    when b.status = 'completed'
    then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_all_time_ngn,
  coalesce(sum(case
    when b.status = 'completed'
    then b.hourly_rate_ngn else 0 end), 0)::integer as gross_all_time_ngn,
  -- pending = confirmed (paid) + completed but not yet paid out
  coalesce(sum(case
    when b.status in ('confirmed', 'completed')
      and not exists (
        select 1 from public.payouts po
        where b.id = any(po.booking_ids)
          and po.status in ('pending', 'processed')
      )
    then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as pending_payout_ngn
from public.coaches c
left join public.bookings b on b.coach_id = c.id
group by c.id;
