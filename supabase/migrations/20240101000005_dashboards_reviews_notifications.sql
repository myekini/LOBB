-- 2.7 / 2.8 / 2.9 Dashboards, reviews, admin actions, and SMS jobs

do $$ begin
  create type public.sms_job_status as enum ('pending', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sms_job_type as enum (
    'booking_confirmed_player',
    'booking_confirmed_coach',
    'booking_24h_reminder_player',
    'booking_24h_reminder_coach',
    'booking_cancelled_player',
    'booking_cancelled_coach',
    'review_request_player',
    'payout_processed_coach',
    'coach_approved'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dispute_status as enum ('open', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dispute_resolution as enum ('refund_player', 'release_to_coach', 'split');
exception when duplicate_object then null;
end $$;

alter table public.coaches
  add column if not exists rejection_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists approved_at timestamptz;

alter table public.reviews
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.profiles(id),
  add column if not exists removal_reason text,
  drop constraint if exists reviews_comment_length,
  add constraint reviews_comment_length check (comment is null or char_length(comment) <= 200);

create table if not exists public.sms_jobs (
  id uuid primary key default gen_random_uuid(),
  type public.sms_job_type not null,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_phone text not null,
  message text not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete set null,
  scheduled_for timestamptz not null default now(),
  status public.sms_job_status not null default 'pending',
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists sms_jobs_due_idx
  on public.sms_jobs(status, scheduled_for);

create index if not exists sms_jobs_booking_type_idx
  on public.sms_jobs(booking_id, type);

create unique index if not exists sms_jobs_booking_type_unique_idx
  on public.sms_jobs(booking_id, type)
  where booking_id is not null;

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  opened_by uuid references public.profiles(id) on delete set null,
  reason text not null,
  status public.dispute_status not null default 'open',
  resolution public.dispute_resolution,
  player_refund_percent integer check (player_refund_percent between 0 and 100),
  coach_release_percent integer check (coach_release_percent between 0 and 100),
  internal_notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  amount_ngn integer not null check (amount_ngn >= 0),
  session_count integer not null default 0 check (session_count >= 0),
  booking_ids uuid[] not null default array[]::uuid[],
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  triggered_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_disputes_updated_at on public.disputes;
create trigger set_disputes_updated_at before update on public.disputes
for each row execute function public.set_updated_at();

alter table public.sms_jobs enable row level security;
alter table public.disputes enable row level security;
alter table public.payouts enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists "Booking participants can read disputes" on public.disputes;
create policy "Booking participants can read disputes"
on public.disputes for select
to authenticated
using (
  exists (
    select 1 from public.bookings
    where bookings.id = disputes.booking_id
      and (bookings.coach_id = auth.uid() or bookings.player_id = auth.uid())
  )
);

drop policy if exists "Coaches read their payouts" on public.payouts;
create policy "Coaches read their payouts"
on public.payouts for select
to authenticated
using (coach_id = auth.uid());

drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public"
on public.reviews for select
using (removed_at is null);

drop policy if exists "Players review completed bookings after unlock" on public.reviews;
create policy "Players review completed bookings after unlock"
on public.reviews for insert
to authenticated
with check (
  auth.uid() = player_id
  and (comment is null or char_length(comment) <= 200)
  and exists (
    select 1 from public.bookings
    where bookings.id = reviews.booking_id
      and bookings.coach_id = reviews.coach_id
      and bookings.player_id = auth.uid()
      and bookings.status = 'completed'
      and bookings.starts_at + interval '2 hours' <= now()
  )
);

drop view if exists public.public_reviews;
create or replace view public.public_reviews as
select
  r.id,
  r.booking_id,
  r.coach_id,
  r.rating,
  r.comment,
  r.created_at,
  split_part(coalesce(p.full_name, 'Player'), ' ', 1) as player_first_name
from public.reviews r
join public.profiles p on p.id = r.player_id
where r.removed_at is null;

drop view if exists public.coach_earnings_summary;
create or replace view public.coach_earnings_summary as
select
  c.id as coach_id,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now()) then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_week_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('week', now()) then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_this_week_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now()) then b.hourly_rate_ngn else 0 end), 0)::integer as gross_this_month_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at >= date_trunc('month', now()) then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_this_month_ngn,
  coalesce(sum(case when b.status = 'completed' then b.hourly_rate_ngn else 0 end), 0)::integer as gross_all_time_ngn,
  coalesce(sum(case when b.status = 'completed' then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as net_all_time_ngn,
  coalesce(sum(case when b.status = 'completed' and b.escrow_released_at is not null and not exists (
    select 1 from public.payouts po where b.id = any(po.booking_ids) and po.status in ('pending', 'processed')
  ) then b.hourly_rate_ngn - b.platform_fee_ngn else 0 end), 0)::integer as pending_payout_ngn
from public.coaches c
left join public.bookings b on b.coach_id = c.id
group by c.id;

drop view if exists public.admin_core_metrics;
create or replace view public.admin_core_metrics as
select
  (select count(*)::integer from public.bookings) as total_bookings,
  (select coalesce(sum(total_amount_ngn), 0)::integer from public.bookings where status in ('confirmed', 'completed', 'disputed')) as gmv_ngn,
  (select count(*)::integer from public.coaches where status = 'active') as active_coaches,
  (select count(*)::integer from public.players) as active_players,
  (select coalesce(sum(platform_fee_ngn), 0)::integer from public.bookings where status = 'completed') as lobb_earnings_ngn,
  (select count(*)::integer from public.coaches where status = 'pending_review') as pending_coach_approvals,
  (select count(*)::integer from public.disputes where status = 'open') as open_disputes;

create or replace function public.can_review_booking(p_booking_id uuid, p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.player_id = p_player_id
      and b.status = 'completed'
      and b.starts_at + interval '2 hours' <= now()
      and not exists (select 1 from public.reviews r where r.booking_id = b.id)
  );
$$;
