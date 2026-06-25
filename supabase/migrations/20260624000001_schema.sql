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
