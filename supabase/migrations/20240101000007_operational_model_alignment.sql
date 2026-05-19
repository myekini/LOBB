-- 4.3 / 4.4 / 4.5 / 4.6 / 4.7 operational model alignment
-- Canonical tables remain:
--   coach_availability -> spec availability_slots
--   coach_availability_blocks -> spec blocked_dates
--   bookings -> spec bookings, with additional spec-shaped columns
--   reviews -> spec reviews
--   sms_jobs -> spec notifications

do $$ begin
  alter type public.booking_status add value if not exists 'pending_payment';
  alter type public.booking_status add value if not exists 'cancelled_by_player';
  alter type public.booking_status add value if not exists 'cancelled_by_coach';
  alter type public.booking_status add value if not exists 'refunded';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_channel as enum ('sms', 'email');
exception when duplicate_object then null;
end $$;

alter table public.coach_availability
  add column if not exists is_active boolean not null default true;

alter table public.bookings
  add column if not exists session_date date,
  add column if not exists session_start_time time,
  add column if not exists session_end_time time,
  add column if not exists location_note text,
  add column if not exists player_note text,
  add column if not exists gross_amount integer,
  add column if not exists platform_commission_ngn integer not null default 0 check (platform_commission_ngn >= 0),
  add column if not exists convenience_fee_ngn integer not null default 0 check (convenience_fee_ngn >= 0),
  add column if not exists coach_payout_ngn integer not null default 0 check (coach_payout_ngn >= 0),
  add column if not exists paystack_reference text unique,
  add column if not exists paystack_transfer_code text;

create or replace function public.sync_booking_spec_columns()
returns trigger
language plpgsql
as $$
begin
  if new.starts_at is not null then
    new.session_date := coalesce(new.session_date, (new.starts_at at time zone 'Africa/Lagos')::date);
    new.session_start_time := coalesce(new.session_start_time, (new.starts_at at time zone 'Africa/Lagos')::time);
  end if;

  if new.ends_at is not null then
    new.session_end_time := coalesce(new.session_end_time, (new.ends_at at time zone 'Africa/Lagos')::time);
  end if;

  new.location_note := coalesce(new.location_note, new.location);
  new.player_note := coalesce(new.player_note, new.player_notes);
  new.gross_amount := coalesce(new.gross_amount, new.total_amount_ngn);
  new.convenience_fee_ngn := coalesce(nullif(new.convenience_fee_ngn, 0), new.platform_fee_ngn);
  new.platform_commission_ngn := coalesce(
    nullif(new.platform_commission_ngn, 0),
    greatest(0, round(new.hourly_rate_ngn * 0.15)::integer)
  );
  new.coach_payout_ngn := coalesce(
    nullif(new.coach_payout_ngn, 0),
    greatest(0, new.hourly_rate_ngn - new.platform_commission_ngn)
  );

  return new;
end;
$$;

drop trigger if exists sync_booking_spec_columns_trigger on public.bookings;
create trigger sync_booking_spec_columns_trigger
before insert or update on public.bookings
for each row execute function public.sync_booking_spec_columns();

update public.bookings
set
  session_date = (starts_at at time zone 'Africa/Lagos')::date,
  session_start_time = (starts_at at time zone 'Africa/Lagos')::time,
  session_end_time = (ends_at at time zone 'Africa/Lagos')::time,
  location_note = coalesce(location_note, location),
  player_note = coalesce(player_note, player_notes),
  gross_amount = coalesce(gross_amount, total_amount_ngn),
  convenience_fee_ngn = coalesce(nullif(convenience_fee_ngn, 0), platform_fee_ngn),
  platform_commission_ngn = coalesce(nullif(platform_commission_ngn, 0), greatest(0, round(hourly_rate_ngn * 0.15)::integer)),
  coach_payout_ngn = coalesce(nullif(coach_payout_ngn, 0), greatest(0, hourly_rate_ngn - greatest(0, round(hourly_rate_ngn * 0.15)::integer)));

update public.bookings b
set
  paystack_reference = p.paystack_reference,
  paystack_transfer_code = p.paystack_transfer_code
from public.payments p
where p.booking_id = b.id
  and b.paystack_reference is null;

alter table public.bookings
  alter column session_date set not null,
  alter column session_start_time set not null,
  alter column session_end_time set not null,
  alter column gross_amount set not null;

drop view if exists public.availability_slots;
create or replace view public.availability_slots as
select
  id,
  coach_id,
  day_of_week,
  starts_at as start_time,
  ends_at as end_time,
  is_active,
  created_at
from public.coach_availability;

drop view if exists public.blocked_dates;
create or replace view public.blocked_dates as
select
  id,
  coach_id,
  blocked_date,
  reason,
  created_at
from public.coach_availability_blocks;

drop view if exists public.booking_records;
create or replace view public.booking_records as
select
  b.id,
  b.player_id,
  b.coach_id,
  b.session_date,
  b.session_start_time,
  b.session_end_time,
  b.location_note,
  b.player_note,
  case
    when b.status = 'pending' then 'pending_payment'
    when b.status = 'cancelled' and b.cancelled_by = 'player' then 'cancelled_by_player'
    when b.status = 'cancelled' and b.cancelled_by = 'coach' then 'cancelled_by_coach'
    else b.status::text
  end as status,
  b.gross_amount,
  b.platform_commission_ngn as platform_fee,
  b.convenience_fee_ngn as convenience_fee,
  b.coach_payout_ngn as coach_payout,
  coalesce(b.paystack_reference, p.paystack_reference) as paystack_reference,
  coalesce(b.paystack_transfer_code, p.paystack_transfer_code) as paystack_transfer_code,
  b.escrow_released_at,
  b.cancelled_at,
  b.cancellation_reason as cancel_reason,
  b.created_at,
  b.updated_at
from public.bookings b
left join public.payments p on p.booking_id = b.id;

drop view if exists public.review_records;
create or replace view public.review_records as
select
  id,
  booking_id,
  player_id,
  coach_id,
  rating::integer as rating,
  comment,
  (removed_at is null) as is_visible,
  created_at
from public.reviews;

drop view if exists public.notifications;
create or replace view public.notifications as
select
  id,
  recipient_user_id as user_id,
  type::text as type,
  'sms'::public.notification_channel as channel,
  recipient_phone as recipient,
  message as body,
  case
    when status = 'cancelled' then 'failed'
    else status::text
  end as status,
  sent_at,
  created_at
from public.sms_jobs;

drop view if exists public.coach_earnings_summary;
create or replace view public.coach_earnings_summary as
select
  c.id as coach_id,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now()) then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_week_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now()) then b.coach_payout_ngn else 0 end), 0)::integer as net_this_week_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now()) then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_month_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now()) then b.coach_payout_ngn else 0 end), 0)::integer as net_this_month_ngn,
  coalesce(sum(case when b.status = 'completed' then b.hourly_rate_ngn else 0 end), 0)::integer as gross_all_time_ngn,
  coalesce(sum(case when b.status = 'completed' then b.coach_payout_ngn else 0 end), 0)::integer as net_all_time_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at is not null and not exists (
    select 1 from public.payouts po where b.id = any(po.booking_ids) and po.status in ('pending', 'processed')
  ) then b.coach_payout_ngn else 0 end), 0)::integer as pending_payout_ngn
from public.coaches c
left join public.bookings b on b.coach_id = c.id
group by c.id;

drop view if exists public.admin_core_metrics;
create or replace view public.admin_core_metrics as
select
  (select count(*)::integer from public.bookings) as total_bookings,
  (select coalesce(sum(gross_amount), 0)::integer from public.bookings where status in ('confirmed', 'completed', 'disputed')) as gmv_ngn,
  (select count(*)::integer from public.coaches where status = 'active') as active_coaches,
  (select count(*)::integer from public.players) as active_players,
  (select coalesce(sum(platform_commission_ngn + convenience_fee_ngn), 0)::integer from public.bookings where status = 'completed') as lobb_earnings_ngn,
  (select count(*)::integer from public.coaches where status = 'pending_review') as pending_coach_approvals,
  (select count(*)::integer from public.disputes where status = 'open') as open_disputes;
