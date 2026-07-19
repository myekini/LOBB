-- Fix schema drift between production and fresh databases (staging), AND a
-- live commission-reporting bug on production. Run on BOTH — not staging-only.
--
-- Part A (fresh-DB blocker): the canonical schema defines bookings.
-- session_date/session_start_time/session_end_time as GENERATED ALWAYS, but
-- the booking API inserts explicit values into them (production's columns
-- predate the canonical file and are plain/writable, which is why this never
-- surfaced there). On a fresh DB every booking insert failed with "cannot
-- insert a non-DEFAULT value into column" — surfaced to players as
-- PAYMENT_INIT_FAILED. This part is a genuine no-op on production.
--
-- Part B (live bug on production, not a no-op): the current
-- sync_booking_spec_columns() unconditionally overwrites
-- platform_commission_ngn with platform_fee_ngn. The booking API inserts the
-- correct 15%-of-session-rate commission into platform_commission_ngn and a
-- separate 5% convenience_fee into platform_fee_ngn — the trigger then
-- clobbers the former with the latter on every booking. Verified against 5
-- real production bookings: platform_commission_ngn reads e.g. 500 where the
-- correct commission is 1,500 (3x under-reported). Actual money movement
-- (charges, coach payouts) is unaffected — only this reporting column, which
-- feeds the admin earnings dashboard, is wrong. The new trigger preserves a
-- caller-supplied non-zero platform_commission_ngn instead of overwriting it.
--
-- Normalize: convert generated columns to regular writable columns (DROP
-- EXPRESSION keeps existing values), and have sync_booking_spec_columns()
-- derive session_date/start/end from starts_at/ends_at on every write.

do $$
declare col text;
begin
  for col in select unnest(array['session_date', 'session_start_time', 'session_end_time']) loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'bookings'
        and column_name = col and is_generated = 'ALWAYS'
    ) then
      execute format('alter table public.bookings alter column %I drop expression', col);
    end if;
  end loop;
end $$;

-- Keep the derived columns in sync regardless of what the caller sends
create or replace function public.sync_booking_spec_columns()
returns trigger language plpgsql as $$
begin
  new.session_date       := (new.starts_at at time zone 'Africa/Lagos')::date;
  new.session_start_time := (new.starts_at at time zone 'Africa/Lagos')::time;
  new.session_end_time   := (new.ends_at   at time zone 'Africa/Lagos')::time;

  new.gross_amount            := new.total_amount_ngn;
  new.platform_commission_ngn := coalesce(nullif(new.platform_commission_ngn, 0), new.platform_fee_ngn);
  if new.coach_payout_ngn = 0 then
    new.coach_payout_ngn := new.total_amount_ngn - new.platform_fee_ngn;
  end if;

  if new.player_note is null and new.player_notes is not null then
    new.player_note := new.player_notes;
  elsif new.player_notes is null and new.player_note is not null then
    new.player_notes := new.player_note;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_booking_spec_columns on public.bookings;
create trigger sync_booking_spec_columns
  before insert or update on public.bookings
  for each row execute function public.sync_booking_spec_columns();
