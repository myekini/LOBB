-- LOBB staging bootstrap — all migrations concatenated in order.
-- Safe to run on a partially-migrated database (statements are idempotent).
-- Generated 2026-07-15. Paste into the Supabase SQL editor and Run.


-- ═══════════════════════════════════════════════════════════════════
-- 20260624000001_schema.sql
-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- LOBB Marketplace — Canonical Schema
-- Consolidates all prior migrations into one auditable DDL source of truth.
--
-- Domain order: enums → core identity → availability → bookings/payments
--               → notifications → reviews/referrals → compliance/audit
--
-- Dropped from prior iterations:
--   • court_slot_bookings (zero code references — future feature, add when needed)
--   • notification_channel enum (unused — views that referenced it were dropped)
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

do $$ begin create type public.user_role as enum ('player', 'coach', 'admin'); exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coach_status as enum (
    'draft', 'pending_review', 'active', 'paused', 'rejected', 'suspended'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum (
    'pending',
    'pending_payment',
    'confirmed',
    'completed',
    'cancelled',
    'cancelled_by_player',
    'cancelled_by_coach',
    'refunded',
    'disputed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending', 'authorized', 'paid', 'failed', 'refunded', 'partial_refund'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sms_job_status as enum ('pending', 'sent', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sms_job_type as enum (
    -- booking lifecycle
    'booking_confirmed_player',
    'booking_confirmed_coach',
    'booking_24h_reminder_player',
    'booking_24h_reminder_coach',
    'booking_cancelled_player',
    'booking_cancelled_coach',
    'booking_rescheduled_player',
    'booking_rescheduled_coach',
    'booking_payment_receipt_player',
    'booking_payment_initiated_coach',
    -- payment
    'payment_failed_player',
    'refund_issued_player',
    -- post-session
    'review_request_player',
    'payout_processed_coach',
    -- coach lifecycle
    'coach_approved',
    'coach_rejected',
    -- misc
    'waitlist_update_player',
    'trial_confirmed_player',
    'admin_digest'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dispute_status as enum ('open', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dispute_resolution as enum (
    'refund_player', 'release_to_coach', 'split'
  );
exception when duplicate_object then null; end $$;

-- ─── Utility function ─────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Maps to auth.users; extended with marketplace-specific columns.

create table if not exists public.profiles (
  id                          uuid        primary key references auth.users(id) on delete cascade,
  phone_number                text        unique,
  email                       text        unique,
  role                        public.user_role not null default 'player',
  full_name                   text,
  avatar_url                  text,
  is_active                   boolean     not null default true,
  email_verified_at           timestamptz,
  email_notifications_enabled boolean     not null default true,
  marketing_emails_enabled    boolean     not null default false,
  -- referral attribution (set once at signup, immutable thereafter)
  referred_by_coach_id        uuid,       -- FK added after coaches table
  referred_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_unique_idx
  on public.profiles (lower(email))
  where email is not null;

-- ─── Coaches ──────────────────────────────────────────────────────────────────
-- One row per coach user. Status drives visibility and payout eligibility.

create table if not exists public.coaches (
  id                   uuid        primary key references public.profiles(id) on delete cascade,

  -- Profile content
  full_name            text        not null,
  bio                  text,                          -- nullable during draft onboarding
  headline             text,
  hourly_rate_ngn      integer     check (hourly_rate_ngn is null or hourly_rate_ngn >= 1000),
  experience_years     integer     not null default 0 check (experience_years >= 0),
  primary_location     text,                          -- nullable during draft onboarding
  service_areas        text[]      not null default array[]::text[],
  skill_levels         text[]      not null default array[]::text[],
  specializations      text[]      not null default array[]::text[],
  languages            text[]      not null default array[]::text[],
  certifications       text[]      not null default array[]::text[],
  court_access         text        not null default 'player_arranges'
                                     check (court_access in ('coach_has_access', 'player_arranges', 'coach_can_recommend')),
  courts_worked_with   text[]      not null default array[]::text[],
  demo_video_url       text,
  profile_photo_url    text,
  slug                 text        unique,

  -- Lifecycle
  status               public.coach_status not null default 'draft',
  is_verified          boolean     not null default false,
  strike_count         integer     not null default 0,

  -- Rejection tracking (3 strikes → needs_direct_contact)
  rejection_count      integer     not null default 0,
  rejection_reason     text,
  needs_direct_contact boolean     not null default false,
  suspended_at         timestamptz,
  suspended_reason     text,
  approved_at          timestamptz,

  -- Bank account (personal — used for DVA issuance and fallback payouts)
  bank_account_number  text        check (bank_account_number is null or char_length(bank_account_number) <= 20),
  bank_code            text        check (bank_code is null or char_length(bank_code) <= 10),
  bank_name            text        check (bank_name is null or char_length(bank_name) <= 100),

  -- Paystack integration
  paystack_subaccount_code  text,  -- legacy split-payment model (superseded by DVA)
  paystack_recipient_code   text,  -- Transfer API — direct payout to personal bank
  paystack_customer_code    text,  -- required for DVA issuance

  -- Dedicated Virtual Account (coach LOBB earnings account)
  dva_account_number   text,
  dva_bank_name        text,
  dva_bank_code        text,

  -- KYC / identity verification
  nin                  text,       -- National Identification Number (11 digits, sensitive)
  bvn                  text,       -- Bank Verification Number (11 digits, sensitive)
  kyc_status           text        not null default 'pending'
                                     check (kyc_status in (
                                       'pending', 'identity_submitted', 'identity_verified',
                                       'identity_failed', 'bvn_pending', 'bvn_verified', 'bvn_failed'
                                     )),
  kyc_nin_verified     boolean     not null default false,
  kyc_bvn_verified     boolean     not null default false,
  kyc_name_from_bvn    text,
  kyc_failed_reason    text,
  kyc_verified_at      timestamptz,

  -- Referral
  referral_code        text        unique,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Back-reference: profiles.referred_by_coach_id → coaches
alter table public.profiles
  drop constraint if exists profiles_referred_by_coach_id_fkey,
  add constraint profiles_referred_by_coach_id_fkey
  foreign key (referred_by_coach_id) references public.coaches(id) on delete set null;

-- ─── Players ──────────────────────────────────────────────────────────────────

create table if not exists public.players (
  id                  uuid        primary key references public.profiles(id) on delete cascade,
  full_name           text        not null,
  skill_level         text,
  preferred_locations text[]      not null default array[]::text[],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Coach availability ───────────────────────────────────────────────────────
-- Weekly recurring windows (day_of_week 0=Sun … 6=Sat, Lagos time).

create table if not exists public.coach_availability (
  id           uuid        primary key default gen_random_uuid(),
  coach_id     uuid        not null references public.coaches(id) on delete cascade,
  day_of_week  smallint    not null check (day_of_week between 0 and 6),
  starts_at    time        not null,
  ends_at      time        not null,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint coach_availability_valid_time check (starts_at < ends_at)
);

-- Full-day blocks (e.g. coach on leave)
create table if not exists public.coach_availability_blocks (
  id           uuid        primary key default gen_random_uuid(),
  coach_id     uuid        not null references public.coaches(id) on delete cascade,
  blocked_date date        not null,
  reason       text,
  created_at   timestamptz not null default now()
);

-- Granular per-slot blocks (e.g. a single 09:00 slot on a specific date)
create table if not exists public.coach_availability_slot_blocks (
  id             uuid        primary key default gen_random_uuid(),
  coach_id       uuid        not null references public.coaches(id) on delete cascade,
  slot_starts_at timestamptz not null,
  slot_ends_at   timestamptz not null,
  reason         text,
  created_at     timestamptz not null default now()
);

-- ─── Slot locks ───────────────────────────────────────────────────────────────
-- Prevents double-booking during the 10-minute player checkout window.
-- One active lock per coach/slot enforced by unique constraint.

create table if not exists public.slot_locks (
  id             uuid        primary key default gen_random_uuid(),
  coach_id       uuid        not null references public.coaches(id) on delete cascade,
  slot_starts_at timestamptz not null,
  locked_by      uuid        not null references public.profiles(id) on delete cascade,
  booking_id     uuid,                                          -- FK added after bookings table
  expires_at     timestamptz not null default (now() + interval '10 minutes'),
  created_at     timestamptz not null default now(),
  constraint slot_locks_coach_slot_unique unique (coach_id, slot_starts_at)
);

-- ─── Bookings ─────────────────────────────────────────────────────────────────
-- Core transaction record. spec-alignment columns (session_date, etc.) are
-- derived from starts_at/ends_at and kept in sync by sync_booking_spec_columns().

create table if not exists public.bookings (
  id                    uuid               primary key default gen_random_uuid(),
  coach_id              uuid               not null references public.coaches(id),
  player_id             uuid               not null references public.players(id),

  -- Scheduling
  starts_at             timestamptz        not null,
  ends_at               timestamptz        not null,
  -- Derived from starts_at/ends_at (Africa/Lagos) — kept in sync by trigger
  session_date          date               not null generated always as ((starts_at at time zone 'Africa/Lagos')::date) stored,
  session_start_time    time               not null generated always as ((starts_at at time zone 'Africa/Lagos')::time) stored,
  session_end_time      time               not null generated always as ((ends_at at time zone 'Africa/Lagos')::time) stored,

  -- Location
  location              text               not null,
  location_note         text,              -- human-readable alias for location
  location_venue_id     text,              -- future: venue/court system reference
  location_court_id     text,

  -- Lifecycle
  status                public.booking_status not null default 'pending',
  human_ref             text               unique,
  player_notes          text,
  player_note           text,              -- spec alias for player_notes

  -- Pricing (all amounts in NGN)
  hourly_rate_ngn       integer            not null check (hourly_rate_ngn >= 0),
  platform_fee_ngn      integer            not null default 0 check (platform_fee_ngn >= 0),
  total_amount_ngn      integer            not null check (total_amount_ngn >= 0),
  gross_amount          integer,           -- alias for total_amount_ngn
  platform_commission_ngn integer          not null default 0 check (platform_commission_ngn >= 0),
  convenience_fee_ngn   integer            not null default 0 check (convenience_fee_ngn >= 0),
  coach_payout_ngn      integer            not null default 0 check (coach_payout_ngn >= 0),

  -- Paystack payment refs (duplicated from payments for fast lookup)
  paystack_reference    text               unique,
  paystack_transfer_code text,
  transfer_last_error   text,

  -- Escrow
  escrow_released_at    timestamptz,

  -- Cancellation
  cancelled_by          text               check (cancelled_by in ('player', 'coach', 'admin')),
  cancelled_at          timestamptz,
  cancellation_reason   text,

  created_at            timestamptz        not null default now(),
  updated_at            timestamptz        not null default now(),

  constraint bookings_valid_time check (starts_at < ends_at)
);

-- Back-reference: slot_locks.booking_id → bookings
alter table public.slot_locks
  drop constraint if exists slot_locks_booking_id_fkey,
  add constraint slot_locks_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete set null;

-- ─── Payments ─────────────────────────────────────────────────────────────────
-- One payment per booking. Paystack webhook keeps status in sync.

create table if not exists public.payments (
  id                     uuid        primary key default gen_random_uuid(),
  booking_id             uuid        not null unique references public.bookings(id) on delete cascade,
  paystack_reference     text        not null unique,
  paystack_access_code   text,
  paystack_transfer_code text,
  status                 public.payment_status not null default 'pending',
  amount_ngn             integer     not null check (amount_ngn >= 0),
  paid_at                timestamptz,
  raw_payload            jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ─── Paystack webhook idempotency ─────────────────────────────────────────────
-- Ensures each event is processed exactly once (service-role writes only).

create table if not exists public.paystack_events (
  id           uuid        primary key default gen_random_uuid(),
  event        text        not null,
  reference    text        not null unique,
  payload      jsonb       not null,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── OTP verifications ────────────────────────────────────────────────────────
-- Persisted OTP state (survives deploys/restarts). Service-role access only.

create table if not exists public.otp_verifications (
  phone_number       text        primary key,
  code_hash          text        not null,
  role               public.user_role not null default 'player',
  attempts           smallint    not null default 0,
  request_timestamps bigint[]    not null default array[]::bigint[],
  expires_at         timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── Reviews ──────────────────────────────────────────────────────────────────
-- One review per completed booking. Admin can soft-remove with a reason.

create table if not exists public.reviews (
  id             uuid        primary key default gen_random_uuid(),
  booking_id     uuid        not null unique references public.bookings(id) on delete cascade,
  coach_id       uuid        not null references public.coaches(id) on delete cascade,
  player_id      uuid        not null references public.players(id) on delete cascade,
  rating         smallint    not null check (rating between 1 and 5),
  comment        text        check (comment is null or char_length(comment) <= 200),
  removed_at     timestamptz,
  removed_by     uuid        references public.profiles(id),
  removal_reason text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── SMS jobs ─────────────────────────────────────────────────────────────────
-- Async queue for all outbound SMS. Processed by cron / edge worker.
-- Unique per booking+type to prevent duplicate notifications.

create table if not exists public.sms_jobs (
  id                uuid        primary key default gen_random_uuid(),
  type              public.sms_job_type not null,
  recipient_user_id uuid        references public.profiles(id) on delete set null,
  recipient_phone   text        not null,
  message           text        not null,
  booking_id        uuid        references public.bookings(id) on delete cascade,
  coach_id          uuid        references public.coaches(id) on delete cascade,
  review_id         uuid        references public.reviews(id) on delete set null,
  scheduled_for     timestamptz not null default now(),
  status            public.sms_job_status not null default 'pending',
  sent_at           timestamptz,
  failed_at         timestamptz,
  error_message     text,
  created_at        timestamptz not null default now()
);

-- ─── Email jobs ───────────────────────────────────────────────────────────────
-- Parallel to sms_jobs for transactional product emails (Resend / similar).
-- Reuses sms_job_type enum — type identifies the communication event, not channel.

create table if not exists public.email_jobs (
  id                  uuid        primary key default gen_random_uuid(),
  type                public.sms_job_type not null,
  recipient_user_id   uuid        references public.profiles(id) on delete set null,
  recipient_email     text        not null,
  subject             text        not null,
  preview             text,
  html                text        not null,
  text                text        not null,
  booking_id          uuid        references public.bookings(id) on delete cascade,
  coach_id            uuid        references public.coaches(id) on delete cascade,
  review_id           uuid        references public.reviews(id) on delete set null,
  scheduled_for       timestamptz not null default now(),
  status              public.sms_job_status not null default 'pending',
  provider_message_id text,
  sent_at             timestamptz,
  failed_at           timestamptz,
  error_message       text,
  created_at          timestamptz not null default now()
);

-- ─── Disputes ─────────────────────────────────────────────────────────────────
-- Admin-managed. One dispute per booking, opened by player or coach.

create table if not exists public.disputes (
  id                   uuid        primary key default gen_random_uuid(),
  booking_id           uuid        not null unique references public.bookings(id) on delete cascade,
  opened_by            uuid        references public.profiles(id) on delete set null,
  reason               text        not null,
  status               public.dispute_status not null default 'open',
  resolution           public.dispute_resolution,
  player_refund_percent integer    check (player_refund_percent between 0 and 100),
  coach_release_percent integer    check (coach_release_percent between 0 and 100),
  internal_notes       text,
  resolved_by          uuid        references public.profiles(id) on delete set null,
  resolved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── Payouts ──────────────────────────────────────────────────────────────────
-- Admin-initiated batch payout records. Not the per-booking transfer_code.

create table if not exists public.payouts (
  id            uuid        primary key default gen_random_uuid(),
  coach_id      uuid        not null references public.coaches(id) on delete cascade,
  amount_ngn    integer     not null check (amount_ngn >= 0),
  session_count integer     not null default 0 check (session_count >= 0),
  booking_ids   uuid[]      not null default array[]::uuid[],
  status        text        not null default 'pending'
                              check (status in ('pending', 'processed', 'failed')),
  triggered_by  uuid        references public.profiles(id) on delete set null,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── Admin audit log ──────────────────────────────────────────────────────────
-- Immutable record of every admin action (approve, reject, suspend, etc.).

create table if not exists public.admin_audit_log (
  id           uuid        primary key default gen_random_uuid(),
  admin_id     uuid        references public.profiles(id) on delete set null,
  action       text        not null,
  target_table text        not null,
  target_id    uuid,
  reason       text,
  metadata     jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ─── Referral credits ─────────────────────────────────────────────────────────
-- ₦1,500 credit per first booking by a player referred by a coach.
-- triggering_booking_id is RESTRICT to preserve the audit trail.

create table if not exists public.referral_credits (
  id                    uuid        primary key default gen_random_uuid(),
  referring_coach_id    uuid        not null references public.coaches(id) on delete cascade,
  referred_user_id      uuid        not null references public.profiles(id) on delete cascade,
  triggering_booking_id uuid        not null unique references public.bookings(id) on delete restrict,
  amount                integer     not null default 1500,
  status                text        not null default 'pending'
                                      check (status in ('pending', 'released', 'paid_out')),
  released_at           timestamptz,
  paid_out_at           timestamptz,
  created_at            timestamptz not null default now()
);

-- ─── Consent logs ─────────────────────────────────────────────────────────────
-- Immutable audit trail of user acceptance for legal documents and sensitive-data
-- consent (ToS, privacy policy, identity verification, coach agreement, etc.).

create table if not exists public.consent_logs (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  document_name     text        not null check (
                                  document_name in (
                                    'terms_of_service',
                                    'privacy_policy',
                                    'cancellation_policy',
                                    'coach_agreement',
                                    'identity_verification_consent',
                                    'coach_profile_accuracy',
                                    'coach_code_of_conduct'
                                  )
                                ),
  document_version  text        not null,  -- e.g. "2026-06"
  accepted_at       timestamptz not null default timezone('utc', now()),
  ip_address        text,
  user_agent        text,
  metadata          jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default timezone('utc', now())
);

comment on table public.consent_logs is 'Audit trail of user acceptance for legal documents and sensitive-data consent.';
comment on column public.coaches.paystack_subaccount_code is 'Legacy: old split-payment subaccount model, superseded by paystack_recipient_code + DVA.';
comment on column public.coaches.nin is 'National Identification Number — KYC. Verified via Smile Identity / VerifyMe (pending CAC).';
comment on column public.coaches.bvn is 'Bank Verification Number — validated via Paystack customer identification during DVA issuance.';

-- ═══════════════════════════════════════════════════════════════════
-- 20260624000002_functions.sql
-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- LOBB Marketplace — Functions & Triggers
-- All PL/pgSQL functions, triggers, and their grants in dependency order.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Updated-at trigger (used by most tables) ─────────────────────────────────
-- Defined here to avoid duplication; the schema migration already defines the
-- function inline, but we re-create it here idempotently as the canonical source.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to every relevant table
do $$ declare t text; begin
  for t in select unnest(array[
    'profiles', 'coaches', 'players',
    'coach_availability', 'bookings', 'payments', 'reviews', 'disputes',
    'otp_verifications'
  ]) loop
    -- Skip tables that don't exist (otp_verifications is dropped by cleanup)
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ─── is_admin ─────────────────────────────────────────────────────────────────
-- Security-definer: reads profiles bypassing RLS to prevent infinite recursion
-- when the RLS policy on profiles itself calls is_admin().

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ─── handle_new_user ──────────────────────────────────────────────────────────
-- Fires on auth.users INSERT. Creates the profiles row and a typed sub-row
-- (coaches or players) based on the raw_user_meta_data.role claim.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role  public.user_role;
  user_name  text;
  user_phone text;
begin
  user_role  := coalesce(new.raw_user_meta_data->>'role', 'player')::public.user_role;
  user_name  := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  user_phone := new.phone;

  insert into public.profiles (id, phone_number, email, role, full_name)
  values (new.id, user_phone, new.email, user_role, user_name)
  on conflict (id) do nothing;

  if user_role = 'coach' then
    insert into public.coaches (id, full_name, status)
    values (new.id, user_name, 'draft')
    on conflict (id) do nothing;
  else
    insert into public.players (id, full_name)
    values (new.id, user_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── generate_coach_slug ──────────────────────────────────────────────────────
-- Derives a URL-safe slug from full_name. Appends a random suffix on collision.

create or replace function public.generate_coach_slug(coach_id uuid, coach_name text)
returns text language plpgsql as $$
declare
  base_slug text;
  candidate text;
  counter   int := 0;
begin
  base_slug := lower(
    regexp_replace(
      regexp_replace(trim(coach_name), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := 'coach';
  end if;

  candidate := base_slug;
  loop
    if not exists (
      select 1 from public.coaches where slug = candidate and id <> coach_id
    ) then
      return candidate;
    end if;
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
end;
$$;

create or replace function public.set_coach_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null and new.full_name is not null then
    new.slug := public.generate_coach_slug(new.id, new.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists set_coach_slug on public.coaches;
create trigger set_coach_slug
  before insert or update of full_name on public.coaches
  for each row execute function public.set_coach_slug();

-- ─── Referral code ────────────────────────────────────────────────────────────
-- Generates a short uppercase referral code on coach insert if none provided.

create or replace function public.set_coach_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_coach_referral_code on public.coaches;
create trigger set_coach_referral_code
  before insert on public.coaches
  for each row execute function public.set_coach_referral_code();

-- ─── Human-readable booking reference ────────────────────────────────────────
-- Pattern: LOBB-YYYYMMDD-XXXX (date component helps support staff locate it)

create or replace function public.generate_booking_ref()
returns text language plpgsql as $$
declare
  ref text;
begin
  loop
    ref := 'LOBB-' || to_char(now() at time zone 'Africa/Lagos', 'YYYYMMDD') || '-'
           || upper(substring(encode(gen_random_bytes(3), 'hex'), 1, 4));
    exit when not exists (select 1 from public.bookings where human_ref = ref);
  end loop;
  return ref;
end;
$$;

create or replace function public.set_booking_human_ref()
returns trigger language plpgsql as $$
begin
  if new.human_ref is null then
    new.human_ref := public.generate_booking_ref();
  end if;
  return new;
end;
$$;

drop trigger if exists set_booking_human_ref on public.bookings;
create trigger set_booking_human_ref
  before insert on public.bookings
  for each row execute function public.set_booking_human_ref();

-- ─── Booking alias column sync ───────────────────────────────────────────────
-- The schema has both original column names (total_amount_ngn, player_notes)
-- and spec-alignment aliases (gross_amount, player_note, platform_commission_ngn,
-- convenience_fee_ngn, coach_payout_ngn, location_note). This trigger ensures
-- the aliases stay in sync with the canonical columns on every write.
-- session_date/session_start_time/session_end_time are GENERATED ALWAYS — not touched here.

create or replace function public.sync_booking_spec_columns()
returns trigger language plpgsql as $$
begin
  -- Keep spec aliases in sync with canonical columns
  new.gross_amount            := new.total_amount_ngn;
  new.platform_commission_ngn := new.platform_fee_ngn;
  -- coach_payout_ngn: derive if not explicitly provided
  if new.coach_payout_ngn = 0 then
    new.coach_payout_ngn := new.total_amount_ngn - new.platform_fee_ngn;
  end if;
  -- player_note is alias for player_notes
  if new.player_note is null and new.player_notes is not null then
    new.player_note := new.player_notes;
  elsif new.player_notes is null and new.player_note is not null then
    new.player_notes := new.player_note;
  end if;
  -- location_note stays independent (optional human alias set by caller)
  return new;
end;
$$;

drop trigger if exists sync_booking_spec_columns on public.bookings;
create trigger sync_booking_spec_columns
  before insert or update on public.bookings
  for each row execute function public.sync_booking_spec_columns();

-- ─── Escrow release ───────────────────────────────────────────────────────────
-- Called by the admin payout trigger or edge function after verifying the
-- 24-hour cooling-off period has elapsed.

create or replace function public.release_escrow(p_booking_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bookings
  set escrow_released_at = now()
  where id = p_booking_id
    and status = 'completed'
    and escrow_released_at is null;

  if not found then
    raise exception 'Booking % not eligible for escrow release', p_booking_id;
  end if;
end;
$$;

-- ─── OTP cleanup ─────────────────────────────────────────────────────────────
-- Called by pg_cron (or Supabase scheduled function) to purge stale OTP rows.
-- Drop first: prior version returned void; now returns integer (row count).

drop function if exists public.cleanup_expired_otps();
create or replace function public.cleanup_expired_otps()
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from public.otp_verifications where expires_at < now() - interval '1 hour';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ─── can_review_booking ──────────────────────────────────────────────────────
-- Returns true if the current user is the player on a completed booking and
-- has not yet submitted a review for it.

create or replace function public.can_review_booking(p_booking_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from public.bookings b
    left join public.reviews r on r.booking_id = b.id
    where b.id = p_booking_id
      and b.player_id = auth.uid()
      and b.status = 'completed'
      and r.id is null
  )
$$;

-- ─── get_coach_available_slots ───────────────────────────────────────────────
-- Returns 1-hour timeslots available for booking across a 30-day window.
-- All logic runs in Africa/Lagos timezone but returns UTC timestamptz pairs.
--
-- Exclusions:
--   1. Slots that fall outside the coach's recurring weekly availability windows
--   2. Days blocked by coach_availability_blocks (full-day blocks)
--   3. Granular blocks in coach_availability_slot_blocks
--   4. Slots already covered by a confirmed/pending booking
--   5. Slots held by a non-expired slot_lock (checkout reservation)

create or replace function public.get_coach_available_slots(
  p_coach_id   uuid,
  p_from_date  date default (now() at time zone 'Africa/Lagos')::date,
  p_to_date    date default ((now() at time zone 'Africa/Lagos') + interval '30 days')::date
)
returns table (slot_starts_at timestamptz, slot_ends_at timestamptz)
language plpgsql stable security definer as $$
declare
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
  v_day        date;
  v_avail      record;
  v_hour       time;
begin
  -- Walk each day in the window
  v_day := p_from_date;
  while v_day <= p_to_date loop

    -- Skip the day if there is a full-day block
    if exists (
      select 1 from public.coach_availability_blocks
      where coach_id = p_coach_id and blocked_date = v_day
    ) then
      v_day := v_day + 1;
      continue;
    end if;

    -- Iterate over recurring availability windows that match this day-of-week
    for v_avail in
      select starts_at, ends_at
      from public.coach_availability
      where coach_id = p_coach_id
        and is_active = true
        and day_of_week = extract(dow from v_day)::smallint
    loop
      -- Step through 1-hour slots within the window
      v_hour := v_avail.starts_at;
      while v_hour < v_avail.ends_at loop
        v_slot_start := (v_day::text || ' ' || v_hour::text)::timestamptz
                        at time zone 'Africa/Lagos';
        v_slot_end   := v_slot_start + interval '1 hour';

        -- Skip if slot end would exceed the availability window
        if (v_slot_end at time zone 'Africa/Lagos')::time > v_avail.ends_at then
          exit;
        end if;

        -- Skip if the slot is in the past
        if v_slot_start <= now() then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a granular slot block covers this slot
        if exists (
          select 1 from public.coach_availability_slot_blocks
          where coach_id = p_coach_id
            and slot_starts_at <= v_slot_start
            and slot_ends_at   >= v_slot_end
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if already booked (any non-cancelled status overlaps this slot)
        if exists (
          select 1 from public.bookings
          where coach_id = p_coach_id
            and status not in ('cancelled', 'cancelled_by_player', 'cancelled_by_coach', 'refunded')
            and starts_at < v_slot_end
            and ends_at   > v_slot_start
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a live checkout lock holds this slot
        if exists (
          select 1 from public.slot_locks
          where coach_id = p_coach_id
            and slot_starts_at = v_slot_start
            and expires_at > now()
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        slot_starts_at := v_slot_start;
        slot_ends_at   := v_slot_end;
        return next;

        v_hour := v_hour + interval '1 hour';
      end loop;
    end loop;

    v_day := v_day + 1;
  end loop;
end;
$$;

-- ─── JWT custom access token hook ────────────────────────────────────────────
-- Embeds the user's role in JWT claims so middleware can gate routes without
-- a DB round-trip on every request.
--
-- IMPORTANT: After running this migration, go to:
--   Supabase Dashboard → Authentication → Hooks
--   and enable "Custom Access Token" pointing to this function.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  user_role  public.user_role;
  claims     jsonb;
begin
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', '"player"');
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant execute to the supabase_auth_admin role (required for the hook)
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.get_coach_available_slots(uuid, date, date) to authenticated, anon;
grant execute on function public.can_review_booking(uuid) to authenticated;
grant execute on function public.cleanup_expired_otps() to service_role;
grant execute on function public.release_escrow(uuid) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 20260624000003_views_rls.sql
-- ═══════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════
-- 20260624000004_indexes.sql
-- ═══════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════════
-- LOBB Marketplace — Indexes
-- Performance indexes grouped by query pattern.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── profiles ─────────────────────────────────────────────────────────────────

create index if not exists profiles_role_idx           on public.profiles (role);
create index if not exists profiles_referred_by_idx    on public.profiles (referred_by_coach_id) where referred_by_coach_id is not null;

-- ─── coaches ──────────────────────────────────────────────────────────────────

create index if not exists coaches_status_idx          on public.coaches (status);
create index if not exists coaches_slug_idx            on public.coaches (slug) where slug is not null;
create index if not exists coaches_referral_code_idx   on public.coaches (referral_code) where referral_code is not null;
create index if not exists coaches_kyc_status_idx      on public.coaches (kyc_status);
-- GIN indexes for array column containment queries (@>)
create index if not exists coaches_specializations_idx on public.coaches using gin (specializations);
create index if not exists coaches_service_areas_idx   on public.coaches using gin (service_areas);

-- ─── coach_availability ───────────────────────────────────────────────────────

create index if not exists availability_coach_day_idx  on public.coach_availability (coach_id, day_of_week) where is_active = true;

-- ─── coach_availability_blocks ────────────────────────────────────────────────

create index if not exists avail_blocks_coach_date_idx on public.coach_availability_blocks (coach_id, blocked_date);

-- ─── coach_availability_slot_blocks ──────────────────────────────────────────

create index if not exists slot_blocks_coach_range_idx on public.coach_availability_slot_blocks (coach_id, slot_starts_at, slot_ends_at);

-- ─── slot_locks ───────────────────────────────────────────────────────────────
-- Full index on (coach_id, slot_starts_at) — expires_at filter applied at query time.
-- Note: partial index with now() is not allowed (now() is not IMMUTABLE).

create index if not exists slot_locks_coach_slot_idx   on public.slot_locks (coach_id, slot_starts_at);
create index if not exists slot_locks_expires_idx      on public.slot_locks (expires_at);

-- ─── bookings ─────────────────────────────────────────────────────────────────

create index if not exists bookings_coach_starts_idx         on public.bookings (coach_id, starts_at);
create index if not exists bookings_player_starts_idx        on public.bookings (player_id, starts_at);
create index if not exists bookings_status_idx               on public.bookings (status);
create index if not exists bookings_session_date_idx         on public.bookings (session_date);
create index if not exists bookings_paystack_reference_idx   on public.bookings (paystack_reference) where paystack_reference is not null;

-- Payout pipeline: completed bookings eligible for escrow release
create index if not exists bookings_escrow_release_idx
  on public.bookings (coach_id, ends_at)
  where status = 'completed' and escrow_released_at is null;

-- Retry queue: completed bookings with released escrow but no transfer yet
create index if not exists bookings_pending_transfer_idx
  on public.bookings (coach_id)
  where status = 'completed'
    and escrow_released_at is not null
    and paystack_transfer_code is null;

-- ─── payments ─────────────────────────────────────────────────────────────────

create index if not exists payments_booking_idx    on public.payments (booking_id);
create index if not exists payments_status_idx     on public.payments (status);
create index if not exists payments_reference_idx  on public.payments (paystack_reference);

-- ─── paystack_events ──────────────────────────────────────────────────────────

create index if not exists paystack_events_ref_idx on public.paystack_events (reference);

-- ─── otp_verifications ────────────────────────────────────────────────────────

create index if not exists otp_expires_idx on public.otp_verifications (expires_at);

-- ─── reviews ──────────────────────────────────────────────────────────────────

create index if not exists reviews_coach_idx   on public.reviews (coach_id) where removed_at is null;
create index if not exists reviews_player_idx  on public.reviews (player_id);
create index if not exists reviews_booking_idx on public.reviews (booking_id);

-- ─── sms_jobs ─────────────────────────────────────────────────────────────────

create index if not exists sms_jobs_status_scheduled_idx
  on public.sms_jobs (scheduled_for, status)
  where status = 'pending';

-- ─── email_jobs ───────────────────────────────────────────────────────────────

create index if not exists email_jobs_status_scheduled_idx
  on public.email_jobs (scheduled_for, status)
  where status = 'pending';

-- ─── disputes ─────────────────────────────────────────────────────────────────

create index if not exists disputes_status_idx   on public.disputes (status) where status = 'open';
create index if not exists disputes_booking_idx  on public.disputes (booking_id);

-- ─── payouts ──────────────────────────────────────────────────────────────────

create index if not exists payouts_coach_idx     on public.payouts (coach_id);
create index if not exists payouts_status_idx    on public.payouts (status) where status = 'pending';

-- ─── referral_credits ─────────────────────────────────────────────────────────

create index if not exists referral_credits_coach_idx    on public.referral_credits (referring_coach_id);
create index if not exists referral_credits_user_idx     on public.referral_credits (referred_user_id);
create index if not exists referral_credits_booking_idx  on public.referral_credits (triggering_booking_id);
create index if not exists referral_credits_status_idx   on public.referral_credits (status) where status = 'pending';

-- ─── consent_logs ─────────────────────────────────────────────────────────────

create index if not exists consent_logs_user_idx     on public.consent_logs (user_id);
create index if not exists consent_logs_doc_idx      on public.consent_logs (document_name, accepted_at);

-- ═══════════════════════════════════════════════════════════════════
-- 20260627000001_availability_upsert_fn.sql
-- ═══════════════════════════════════════════════════════════════════
-- ─── set_coach_availability ───────────────────────────────────────────────────
-- Atomically replaces a coach's weekly slots and blocked dates in one transaction.
-- Called from /api/coaches/me/availability PUT via supabase.rpc().
-- Security: verifies p_coach_id matches the calling user's auth.uid().

create or replace function public.set_coach_availability(
  p_coach_id   uuid,
  p_slots       jsonb,  -- [{day_of_week, starts_at, ends_at}]
  p_blocked_dates text[] -- ['YYYY-MM-DD', ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Caller must own the coach record
  if p_coach_id != auth.uid() and not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0401';
  end if;

  -- Replace weekly slots
  delete from public.coach_availability where coach_id = p_coach_id;

  if jsonb_array_length(p_slots) > 0 then
    insert into public.coach_availability (coach_id, is_active, day_of_week, starts_at, ends_at)
    select
      p_coach_id,
      true,
      (slot->>'day_of_week')::int,
      (slot->>'starts_at')::time,
      (slot->>'ends_at')::time
    from jsonb_array_elements(p_slots) as slot;
  end if;

  -- Replace blocked dates
  delete from public.coach_availability_blocks where coach_id = p_coach_id;

  if array_length(p_blocked_dates, 1) > 0 then
    insert into public.coach_availability_blocks (coach_id, blocked_date)
    select p_coach_id, d::date
    from unnest(p_blocked_dates) as d;
  end if;
end;
$$;

grant execute on function public.set_coach_availability(uuid, jsonb, text[]) to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 20260628000001_repair_auth_profiles.sql
-- ═══════════════════════════════════════════════════════════════════
-- Repair Auth users that do not have the public rows required by the app.
-- Idempotent: safe to apply more than once.

insert into public.profiles (id, email, role, full_name)
select
  u.id,
  lower(u.email),
  case u.raw_user_meta_data->>'role'
    when 'coach' then 'coach'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end,
  null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.coaches (id, full_name, status)
select
  p.id,
  coalesce(nullif(split_part(p.email, '@', 1), ''), 'Coach'),
  'draft'
from public.profiles p
left join public.coaches c on c.id = p.id
where p.role = 'coach'
  and c.id is null
on conflict (id) do nothing;

insert into public.players (id, full_name)
select
  p.id,
  coalesce(nullif(split_part(p.email, '@', 1), ''), 'Player')
from public.profiles p
left join public.players pl on pl.id = p.id
where p.role = 'player'
  and pl.id is null
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- 20260711000001_fix_available_slots_ambiguity.sql
-- ═══════════════════════════════════════════════════════════════════
-- Fix: get_coach_available_slots failed with `column reference "slot_starts_at" is ambiguous`.
-- The RETURNS TABLE out-params (slot_starts_at, slot_ends_at) collide with columns of the
-- same name in coach_availability_slot_blocks and slot_locks. Qualify every column in the
-- EXISTS subqueries so PL/pgSQL resolves them to the tables, not the out-params.

create or replace function public.get_coach_available_slots(
  p_coach_id   uuid,
  p_from_date  date default (now() at time zone 'Africa/Lagos')::date,
  p_to_date    date default ((now() at time zone 'Africa/Lagos') + interval '30 days')::date
)
returns table (slot_starts_at timestamptz, slot_ends_at timestamptz)
language plpgsql stable security definer as $$
declare
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
  v_day        date;
  v_avail      record;
  v_hour       time;
begin
  v_day := p_from_date;
  while v_day <= p_to_date loop

    -- Skip the day if there is a full-day block
    if exists (
      select 1 from public.coach_availability_blocks b
      where b.coach_id = p_coach_id and b.blocked_date = v_day
    ) then
      v_day := v_day + 1;
      continue;
    end if;

    -- Iterate over recurring availability windows that match this day-of-week
    for v_avail in
      select ca.starts_at, ca.ends_at
      from public.coach_availability ca
      where ca.coach_id = p_coach_id
        and ca.is_active = true
        and ca.day_of_week = extract(dow from v_day)::smallint
    loop
      v_hour := v_avail.starts_at;
      while v_hour < v_avail.ends_at loop
        v_slot_start := (v_day::text || ' ' || v_hour::text)::timestamptz
                        at time zone 'Africa/Lagos';
        v_slot_end   := v_slot_start + interval '1 hour';

        -- Skip if slot end would exceed the availability window
        if (v_slot_end at time zone 'Africa/Lagos')::time > v_avail.ends_at then
          exit;
        end if;

        -- Skip if the slot is in the past
        if v_slot_start <= now() then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a granular slot block covers this slot
        if exists (
          select 1 from public.coach_availability_slot_blocks sb
          where sb.coach_id = p_coach_id
            and sb.slot_starts_at <= v_slot_start
            and sb.slot_ends_at   >= v_slot_end
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if already booked (any non-cancelled status overlaps this slot)
        if exists (
          select 1 from public.bookings bk
          where bk.coach_id = p_coach_id
            and bk.status not in ('cancelled', 'cancelled_by_player', 'cancelled_by_coach', 'refunded')
            and bk.starts_at < v_slot_end
            and bk.ends_at   > v_slot_start
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a live checkout lock holds this slot
        if exists (
          select 1 from public.slot_locks sl
          where sl.coach_id = p_coach_id
            and sl.slot_starts_at = v_slot_start
            and sl.expires_at > now()
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        slot_starts_at := v_slot_start;
        slot_ends_at   := v_slot_end;
        return next;

        v_hour := v_hour + interval '1 hour';
      end loop;
    end loop;

    v_day := v_day + 1;
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 20260712000001_fix_handle_new_user_coach.sql
-- ═══════════════════════════════════════════════════════════════════
-- Fix coach registration failing with "Database error saving new user".
-- The deployed handle_new_user's coach branch errors (signInWithOtp 500s for
-- role=coach, player works), so redefine it from source. Two changes vs the
-- old repo version:
--
-- 1. profiles.full_name is only set when the signup provides one — NOT derived
--    from the email prefix. The verify page and middleware use a null
--    full_name to mean "onboarding incomplete"; deriving a name made every
--    new player skip /auth/setup/player and land on /home as "taiwo483".
--    (coaches/players sub-rows keep a derived placeholder for NOT NULL safety.)
--
-- 2. The whole body is wrapped in an exception handler: a failure creating
--    public rows must never block the auth user itself — the repair backfill
--    below (and 20260628000001) recovers missing rows.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role     public.user_role;
  provided_name text;
  fallback_name text;
  user_phone    text;
begin
  user_role     := coalesce(new.raw_user_meta_data->>'role', 'player')::public.user_role;
  provided_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  fallback_name := coalesce(provided_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Member');
  user_phone    := new.phone;

  insert into public.profiles (id, phone_number, email, role, full_name)
  values (new.id, user_phone, new.email, user_role, provided_name)
  on conflict (id) do nothing;

  if user_role = 'coach' then
    insert into public.coaches (id, full_name, status)
    values (new.id, fallback_name, 'draft')
    on conflict (id) do nothing;
  elsif user_role = 'player' then
    insert into public.players (id, full_name)
    values (new.id, fallback_name)
    on conflict (id) do nothing;
  end if;

  return new;
exception when others then
  -- Never block auth signup on public-row creation; backfill repairs later.
  raise warning 'handle_new_user failed for % (role %): %', new.id, user_role, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Backfill: repair users created while the trigger was broken ──────────────

insert into public.profiles (id, email, role, full_name)
select
  u.id,
  lower(u.email),
  case u.raw_user_meta_data->>'role'
    when 'coach' then 'coach'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end,
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.coaches (id, full_name, status)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Coach'),
  'draft'
from public.profiles p
left join public.coaches c on c.id = p.id
where p.role = 'coach'
  and c.id is null
on conflict (id) do nothing;

insert into public.players (id, full_name)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Player')
from public.profiles p
left join public.players pl on pl.id = p.id
where p.role = 'player'
  and pl.id is null
on conflict (id) do nothing;

-- Users whose full_name is clearly the derived email prefix (old trigger
-- behaviour) never chose a name — null it so they get routed through
-- onboarding and pick a real one.
update public.profiles
set full_name = null
where full_name is not null
  and full_name = split_part(coalesce(email, ''), '@', 1);

-- ═══════════════════════════════════════════════════════════════════
-- 20260712000002_fix_referral_code_search_path.sql
-- ═══════════════════════════════════════════════════════════════════
-- Root cause of coach registration failing: set_coach_referral_code calls
-- gen_random_bytes() unqualified. That function lives in the `extensions`
-- schema, which is on the search_path for API roles but NOT for
-- supabase_auth_admin (search_path = auth) — the role that runs
-- handle_new_user during signup. So the coaches insert failed only inside
-- the auth trigger, killing every coach signup while player signups worked.
--
-- Use gen_random_uuid() from pg_catalog instead (always resolvable, no
-- extension dependency) — same 8-char uppercase hex code shape.

create or replace function public.set_coach_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

-- ─── Backfill: repair coach users whose public rows were rolled back ─────────

insert into public.profiles (id, email, role, full_name)
select
  u.id,
  lower(u.email),
  case u.raw_user_meta_data->>'role'
    when 'coach' then 'coach'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end,
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.coaches (id, full_name, status)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Coach'),
  'draft'
from public.profiles p
left join public.coaches c on c.id = p.id
where p.role = 'coach'
  and c.id is null
on conflict (id) do nothing;

insert into public.players (id, full_name)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Player')
from public.profiles p
left join public.players pl on pl.id = p.id
where p.role = 'player'
  and pl.id is null
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- 20260713000001_fix_release_escrow.sql
-- ═══════════════════════════════════════════════════════════════════
-- Fix dead payout pipeline: the release-escrow cron selects bookings with
-- status='confirmed' whose session ended 2+ hours ago, but release_escrow()
-- only accepted status='completed' — and nothing ever set 'completed'.
-- Every release raised "not eligible", so escrow was never released and coach
-- transfers (which require completed + escrow_released_at) never ran.
--
-- release_escrow now performs the transition itself: confirmed → completed
-- with escrow_released_at stamped, and stays idempotent-safe for bookings
-- already completed but not yet released.

create or replace function public.release_escrow(p_booking_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bookings
  set status = 'completed',
      escrow_released_at = now()
  where id = p_booking_id
    and status in ('confirmed', 'completed')
    and escrow_released_at is null
    and ends_at <= now();

  if not found then
    raise exception 'Booking % not eligible for escrow release', p_booking_id;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 20260714000001_db_cleanup.sql
-- ═══════════════════════════════════════════════════════════════════
-- DB cleanup: remove dead objects left over from earlier iterations.
--
-- 1. otp_verifications — the custom phone-OTP flow (Twilio era). Auth moved to
--    Supabase email OTP; zero code references remain. Table + its cleanup
--    function + service-role policy go together.
--
-- 2. coaches.paystack_subaccount_code — the old split-payment model,
--    superseded by recipient_code transfers + (future) DVA. No code reads it.
--
-- Deliberately KEPT:
--   disputes                        — parked-for-MVP feature, schema ready
--   coach_availability_slot_blocks  — read by get_available_slots() for
--                                     granular slot blocking
--   payouts                         — used by manual admin payout trigger and
--                                     coach earnings history

drop function if exists public.cleanup_expired_otps();
drop table if exists public.otp_verifications;

alter table public.coaches drop column if exists paystack_subaccount_code;
