-- ═══════════════════════════════════════════════════════════════════════════════
-- LOBB Marketplace — Views, RLS Policies & Storage
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Views ────────────────────────────────────────────────────────────────────
-- Drop before recreating — CREATE OR REPLACE VIEW cannot remove columns.

drop view if exists public.admin_core_metrics cascade;
drop view if exists public.coach_earnings_summary cascade;
drop view if exists public.public_reviews cascade;
drop view if exists public.coach_profiles_public cascade;

-- Public coach listing — excludes sensitive KYC/bank columns.
create view public.coach_profiles_public as
select
  c.id,
  c.full_name,
  c.slug,
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
  c.courts_worked_with,
  c.demo_video_url,
  c.profile_photo_url,
  c.status,
  c.is_verified,
  c.referral_code,
  c.created_at,
  round(avg(r.rating), 1) as avg_rating,
  count(r.id)             as review_count,
  (select count(*) from public.bookings b
   where b.coach_id = c.id and b.status = 'completed')::int as session_count,
  exists (
    select 1 from public.coach_availability ca
    where ca.coach_id = c.id and ca.is_active = true
  ) as has_availability
from public.coaches c
left join public.reviews r
  on r.coach_id = c.id and r.removed_at is null
group by c.id;

-- Non-removed reviews including reviewer display name.
create or replace view public.public_reviews as
select
  r.id,
  r.booking_id,
  r.coach_id,
  r.player_id,
  r.rating,
  r.comment,
  r.created_at,
  p.full_name as player_name,
  p.avatar_url as player_avatar_url
from public.reviews r
join public.profiles p on p.id = r.player_id
where r.removed_at is null;

-- Per-coach earnings aggregates for the coach dashboard.
-- Net = hourly_rate_ngn - platform_fee_ngn (preserves historical pricing at booking time).
create or replace view public.coach_earnings_summary as
select
  b.coach_id,
  coalesce(sum(b.total_amount_ngn)  filter (where b.starts_at >= now() - interval '7 days'), 0)
    as gross_this_week_ngn,
  coalesce(sum(b.hourly_rate_ngn - b.platform_fee_ngn) filter (where b.starts_at >= now() - interval '7 days'), 0)
    as net_this_week_ngn,
  coalesce(sum(b.total_amount_ngn)  filter (where b.starts_at >= date_trunc('month', now())), 0)
    as gross_this_month_ngn,
  coalesce(sum(b.hourly_rate_ngn - b.platform_fee_ngn) filter (where b.starts_at >= date_trunc('month', now())), 0)
    as net_this_month_ngn,
  coalesce(sum(b.total_amount_ngn), 0)
    as gross_all_time_ngn,
  coalesce(sum(b.hourly_rate_ngn - b.platform_fee_ngn), 0)
    as net_all_time_ngn,
  -- Pending: completed sessions whose escrow is released but no transfer yet
  coalesce(sum(b.hourly_rate_ngn - b.platform_fee_ngn) filter (
    where b.status = 'completed'
      and b.escrow_released_at is not null
      and b.paystack_transfer_code is null
  ), 0) as pending_payout_ngn
from public.bookings b
where b.status in ('confirmed', 'completed')
group by b.coach_id;

-- Single-row admin metrics view.
create or replace view public.admin_core_metrics as
select
  -- Coaches
  (select count(*) from public.coaches)                                       as total_coaches,
  (select count(*) from public.coaches where status = 'active')               as active_coaches,
  (select count(*) from public.coaches where status = 'pending_review')       as pending_review_coaches,
  -- Players
  (select count(*) from public.players)                                       as total_players,
  -- Bookings
  (select count(*) from public.bookings)                                      as total_bookings,
  (select count(*) from public.bookings where status = 'completed')           as completed_bookings,
  (select count(*) from public.bookings
   where status in ('pending', 'pending_payment', 'confirmed'))               as active_bookings,
  -- Revenue
  coalesce((select sum(total_amount_ngn) from public.bookings
    where status in ('confirmed', 'completed')), 0)                           as gross_revenue_ngn,
  coalesce((select sum(platform_fee_ngn) from public.bookings
    where status in ('confirmed', 'completed')), 0)                           as platform_revenue_ngn,
  coalesce((select sum(total_amount_ngn) from public.bookings
    where status in ('confirmed', 'completed')
      and starts_at >= now() - interval '7 days'), 0)                        as revenue_this_week_ngn,
  coalesce((select sum(total_amount_ngn) from public.bookings
    where status in ('confirmed', 'completed')
      and starts_at >= date_trunc('month', now())), 0)                       as revenue_this_month_ngn,
  -- Payouts
  (select count(*) from public.bookings
   where status = 'completed'
     and escrow_released_at is not null
     and paystack_transfer_code is null)                                      as stuck_payouts_count,
  -- Disputes
  (select count(*) from public.disputes where status = 'open')               as open_disputes_count;

-- ─── Enable RLS on all user-facing tables ─────────────────────────────────────

alter table public.profiles                      enable row level security;
alter table public.coaches                       enable row level security;
alter table public.players                       enable row level security;
alter table public.coach_availability            enable row level security;
alter table public.coach_availability_blocks     enable row level security;
alter table public.coach_availability_slot_blocks enable row level security;
alter table public.slot_locks                    enable row level security;
alter table public.bookings                      enable row level security;
alter table public.payments                      enable row level security;
alter table public.paystack_events               enable row level security;
alter table public.otp_verifications             enable row level security;
alter table public.reviews                       enable row level security;
alter table public.sms_jobs                      enable row level security;
alter table public.email_jobs                    enable row level security;
alter table public.disputes                      enable row level security;
alter table public.payouts                       enable row level security;
alter table public.admin_audit_log               enable row level security;
alter table public.referral_credits              enable row level security;
alter table public.consent_logs                  enable row level security;

-- ─── profiles ─────────────────────────────────────────────────────────────────

drop policy if exists "profiles: own read"    on public.profiles;
drop policy if exists "profiles: own update"  on public.profiles;
drop policy if exists "profiles: admin all"   on public.profiles;
drop policy if exists "profiles: insert own"  on public.profiles;

create policy "profiles: own read"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: own update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin all"
  on public.profiles for all
  using (public.is_admin());

-- handle_new_user() runs security definer — no insert policy needed for anon.
-- Service role bypasses RLS for admin operations.

-- ─── coaches ──────────────────────────────────────────────────────────────────

drop policy if exists "coaches: public read active"   on public.coaches;
drop policy if exists "coaches: own read"             on public.coaches;
drop policy if exists "coaches: own update"           on public.coaches;
drop policy if exists "coaches: admin all"            on public.coaches;

create policy "coaches: public read active"
  on public.coaches for select
  using (status = 'active');

create policy "coaches: own read"
  on public.coaches for select
  using (id = auth.uid());

create policy "coaches: own update"
  on public.coaches for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "coaches: admin all"
  on public.coaches for all
  using (public.is_admin());

-- ─── players ──────────────────────────────────────────────────────────────────

drop policy if exists "players: own access" on public.players;
drop policy if exists "players: admin all"  on public.players;
-- Coaches need to see the player name/id for their confirmed bookings
drop policy if exists "players: coach sees booked players" on public.players;

create policy "players: own access"
  on public.players for all
  using (id = auth.uid());

create policy "players: coach sees booked players"
  on public.players for select
  using (
    exists (
      select 1 from public.bookings
      where bookings.player_id = players.id
        and bookings.coach_id  = auth.uid()
        and bookings.status not in ('cancelled', 'cancelled_by_player', 'cancelled_by_coach')
    )
  );

create policy "players: admin all"
  on public.players for all
  using (public.is_admin());

-- ─── coach_availability ───────────────────────────────────────────────────────

drop policy if exists "availability: public read"   on public.coach_availability;
drop policy if exists "availability: coach manage"  on public.coach_availability;
drop policy if exists "availability: admin all"     on public.coach_availability;

create policy "availability: public read"
  on public.coach_availability for select
  using (is_active = true);

create policy "availability: coach manage"
  on public.coach_availability for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "availability: admin all"
  on public.coach_availability for all
  using (public.is_admin());

-- ─── coach_availability_blocks ────────────────────────────────────────────────

drop policy if exists "avail_blocks: coach manage"  on public.coach_availability_blocks;
drop policy if exists "avail_blocks: public read"   on public.coach_availability_blocks;
drop policy if exists "avail_blocks: admin all"     on public.coach_availability_blocks;

create policy "avail_blocks: public read"
  on public.coach_availability_blocks for select
  using (true);

create policy "avail_blocks: coach manage"
  on public.coach_availability_blocks for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "avail_blocks: admin all"
  on public.coach_availability_blocks for all
  using (public.is_admin());

-- ─── coach_availability_slot_blocks ──────────────────────────────────────────

drop policy if exists "slot_blocks: public read"  on public.coach_availability_slot_blocks;
drop policy if exists "slot_blocks: coach manage" on public.coach_availability_slot_blocks;
drop policy if exists "slot_blocks: admin all"    on public.coach_availability_slot_blocks;

create policy "slot_blocks: public read"
  on public.coach_availability_slot_blocks for select
  using (true);

create policy "slot_blocks: coach manage"
  on public.coach_availability_slot_blocks for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "slot_blocks: admin all"
  on public.coach_availability_slot_blocks for all
  using (public.is_admin());

-- ─── slot_locks ───────────────────────────────────────────────────────────────

drop policy if exists "slot_locks: own read"   on public.slot_locks;
drop policy if exists "slot_locks: own manage" on public.slot_locks;
drop policy if exists "slot_locks: admin all"  on public.slot_locks;

create policy "slot_locks: own read"
  on public.slot_locks for select
  using (locked_by = auth.uid() or coach_id = auth.uid() or public.is_admin());

create policy "slot_locks: own manage"
  on public.slot_locks for all
  using (locked_by = auth.uid())
  with check (locked_by = auth.uid());

create policy "slot_locks: admin all"
  on public.slot_locks for all
  using (public.is_admin());

-- ─── bookings ─────────────────────────────────────────────────────────────────

drop policy if exists "bookings: player read own"   on public.bookings;
drop policy if exists "bookings: coach read own"    on public.bookings;
drop policy if exists "bookings: player insert"     on public.bookings;
drop policy if exists "bookings: player update own" on public.bookings;
drop policy if exists "bookings: coach update own"  on public.bookings;
drop policy if exists "bookings: admin all"         on public.bookings;

create policy "bookings: player read own"
  on public.bookings for select
  using (player_id = auth.uid());

create policy "bookings: coach read own"
  on public.bookings for select
  using (coach_id = auth.uid());

create policy "bookings: player insert"
  on public.bookings for insert
  with check (player_id = auth.uid());

create policy "bookings: player update own"
  on public.bookings for update
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

create policy "bookings: coach update own"
  on public.bookings for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "bookings: admin all"
  on public.bookings for all
  using (public.is_admin());

-- ─── payments ─────────────────────────────────────────────────────────────────

drop policy if exists "payments: player read own" on public.payments;
drop policy if exists "payments: player insert"   on public.payments;
drop policy if exists "payments: admin all"       on public.payments;

create policy "payments: player read own"
  on public.payments for select
  using (
    exists (select 1 from public.bookings where bookings.id = payments.booking_id and bookings.player_id = auth.uid())
  );

create policy "payments: player insert"
  on public.payments for insert
  with check (
    exists (select 1 from public.bookings where bookings.id = booking_id and bookings.player_id = auth.uid())
  );

create policy "payments: admin all"
  on public.payments for all
  using (public.is_admin());

-- ─── paystack_events — service_role only ─────────────────────────────────────

-- No authenticated user policies; webhook handler runs under service_role.

-- ─── otp_verifications — service_role only ───────────────────────────────────

-- OTP records are written/read only by the OTP API routes via service_role.

-- ─── reviews ──────────────────────────────────────────────────────────────────

drop policy if exists "reviews: public read"     on public.reviews;
drop policy if exists "reviews: player insert"   on public.reviews;
drop policy if exists "reviews: player read own" on public.reviews;
drop policy if exists "reviews: admin all"       on public.reviews;

create policy "reviews: public read"
  on public.reviews for select
  using (removed_at is null);

create policy "reviews: player insert"
  on public.reviews for insert
  with check (
    player_id = auth.uid()
    and public.can_review_booking(booking_id)
  );

create policy "reviews: player read own"
  on public.reviews for select
  using (player_id = auth.uid());

create policy "reviews: admin all"
  on public.reviews for all
  using (public.is_admin());

-- ─── sms_jobs / email_jobs — service_role only ───────────────────────────────

-- These are internal queue tables. Only the service_role (via API routes) writes
-- to them. No authenticated user should read or write directly.

-- ─── disputes ─────────────────────────────────────────────────────────────────

drop policy if exists "disputes: parties read"  on public.disputes;
drop policy if exists "disputes: player insert" on public.disputes;
drop policy if exists "disputes: admin all"     on public.disputes;

create policy "disputes: parties read"
  on public.disputes for select
  using (
    opened_by = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings
      where bookings.id = disputes.booking_id
        and (bookings.player_id = auth.uid() or bookings.coach_id = auth.uid())
    )
  );

create policy "disputes: player insert"
  on public.disputes for insert
  with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.player_id = auth.uid()
        and bookings.status in ('confirmed', 'completed')
    )
  );

create policy "disputes: admin all"
  on public.disputes for all
  using (public.is_admin());

-- ─── payouts ──────────────────────────────────────────────────────────────────

drop policy if exists "payouts: coach read own" on public.payouts;
drop policy if exists "payouts: admin all"      on public.payouts;

create policy "payouts: coach read own"
  on public.payouts for select
  using (coach_id = auth.uid());

create policy "payouts: admin all"
  on public.payouts for all
  using (public.is_admin());

-- ─── admin_audit_log ──────────────────────────────────────────────────────────

drop policy if exists "audit_log: admin read" on public.admin_audit_log;

create policy "audit_log: admin read"
  on public.admin_audit_log for select
  using (public.is_admin());

-- Inserts come from API routes running under service_role.

-- ─── referral_credits ─────────────────────────────────────────────────────────

drop policy if exists "referral_credits: coach read own" on public.referral_credits;
drop policy if exists "referral_credits: admin all"      on public.referral_credits;

create policy "referral_credits: coach read own"
  on public.referral_credits for select
  using (referring_coach_id = auth.uid());

create policy "referral_credits: admin all"
  on public.referral_credits for all
  using (public.is_admin());

-- ─── consent_logs ─────────────────────────────────────────────────────────────

drop policy if exists "consent_logs: own read" on public.consent_logs;
drop policy if exists "consent_logs: admin all" on public.consent_logs;

create policy "consent_logs: own read"
  on public.consent_logs for select
  using (user_id = auth.uid());

create policy "consent_logs: admin all"
  on public.consent_logs for all
  using (public.is_admin());

-- Inserts come from API routes running under service_role.

-- ─── Storage buckets ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('coach-photos', 'coach-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow authenticated users to upload their own avatar
drop policy if exists "avatars: own upload" on storage.objects;
create policy "avatars: own upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: own update" on storage.objects;
create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Coach photos: coaches upload, public reads
drop policy if exists "coach-photos: coach upload" on storage.objects;
create policy "coach-photos: coach upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coach-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (select 1 from public.coaches where id = auth.uid())
  );

drop policy if exists "coach-photos: coach update" on storage.objects;
create policy "coach-photos: coach update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'coach-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach-photos: public read" on storage.objects;
create policy "coach-photos: public read"
  on storage.objects for select
  using (bucket_id = 'coach-photos');
