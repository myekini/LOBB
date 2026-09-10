-- The admin dashboard and earnings pages read admin_core_metrics columns the
-- view never emitted (gmv_ngn, lobb_earnings_ngn, active_players,
-- pending_coach_approvals), so every revenue and queue figure rendered as ₦0 / 0
-- regardless of real activity.
--
-- Redefine the view to emit exactly the six names the app consumes, and drop the
-- dozen columns nothing reads. "lobb_earnings_ngn" uses the same per-booking fee
-- definition as /api/admin/earnings (platform_commission_ngn + convenience_fee_ngn)
-- so there is one definition of platform earnings, not three.

drop view if exists public.admin_core_metrics cascade;

create view public.admin_core_metrics as
select
  (select count(*) from public.bookings)                                as total_bookings,
  (select count(*) from public.coaches where status = 'active')         as active_coaches,
  (select count(*) from public.coaches where status = 'pending_review') as pending_coach_approvals,
  (select count(distinct player_id) from public.bookings)               as active_players,
  coalesce((
    select sum(total_amount_ngn) from public.bookings
    where status in ('confirmed', 'completed')
  ), 0)                                                                 as gmv_ngn,
  coalesce((
    select sum(platform_commission_ngn + convenience_fee_ngn) from public.bookings
    where status in ('confirmed', 'completed')
  ), 0)                                                                 as lobb_earnings_ngn;

-- ── Admin player directory ──────────────────────────────────────────────────
-- The /api/admin/players route fetched every profile AND every booking row and
-- aggregated in JS on each request. Push the aggregation into the database and
-- let the route select a bounded, ordered page.

drop view if exists public.admin_player_directory cascade;

create view public.admin_player_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone_number,
  p.created_at,
  p.referred_by_coach_id,
  count(b.id)                                              as booking_count,
  count(b.id) filter (where b.status = 'completed')        as completed_count,
  coalesce(sum(b.total_amount_ngn) filter (where b.status = 'completed'), 0) as spend_ngn,
  max(b.starts_at)                                         as last_session_at
from public.profiles p
left join public.bookings b on b.player_id = p.id
where p.role = 'player'
group by p.id;

-- ── Admin bookings summary ──────────────────────────────────────────────────
-- Real totals for the current filter/date-range on the bookings ledger, so the
-- page shows "X records worth ₦Y" instead of just what happens to be loaded.

create or replace function public.admin_bookings_summary(
  p_status text default null,
  p_from   timestamptz default null,
  p_to     timestamptz default null
)
returns table (record_count bigint, gross_ngn bigint, payout_ngn bigint)
language sql stable security definer as $$
  select
    count(*)::bigint,
    coalesce(sum(total_amount_ngn), 0)::bigint,
    coalesce(sum(coach_payout_ngn), 0)::bigint
  from public.bookings
  where (p_status is null or status::text = p_status)
    and (p_from is null or starts_at >= p_from)
    and (p_to   is null or starts_at <= p_to);
$$;

-- Supabase does not always apply default privileges to freshly-created views;
-- the admin API reads these as the service role, so grant it explicitly.
grant select on public.admin_core_metrics      to service_role;
grant select on public.admin_player_directory  to service_role;
grant execute on function public.admin_bookings_summary(text, timestamptz, timestamptz) to service_role;
