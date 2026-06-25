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
