-- Production: wipe all booking/session activity, keep every account intact.
--
-- Deletes: bookings, payments, reviews, disputes, referral_credits, payouts,
--          paystack_events, slot_locks, sms_jobs, email_jobs.
-- Keeps:   profiles, players, coaches (rate, status, KYC/DVA, bank details,
--          availability schedules), consent_logs, admin_audit_log.
--
-- Order matters:
--   1. referral_credits first — its FK to bookings is ON DELETE RESTRICT,
--      so it blocks deleting a booking until its credit row is gone.
--   2. payouts / paystack_events have no FK to bookings, delete any time.
--   3. bookings last — cascades to payments, reviews, sms_jobs, email_jobs,
--      disputes automatically (all ON DELETE CASCADE). bookings.coach_id and
--      .player_id have no cascade from coaches/players, so this can never
--      take a coach or player account down with it.
--   4. slot_locks isn't FK'd to bookings for this purpose (booking_id is
--      SET NULL on delete) — clear it too since a stale hold has no value.
--
-- Re-runnable: every statement is a DELETE with no WHERE-mismatch risk, so
-- running this again on an already-clean DB is a no-op.

begin;

delete from public.referral_credits;
delete from public.payouts;
delete from public.paystack_events;
delete from public.bookings;   -- cascades: payments, reviews, sms_jobs, email_jobs, disputes
delete from public.slot_locks;

commit;

-- Verify: coaches/players/profiles counts should be unchanged from before
-- this ran; every table below should read 0.
select
  (select count(*) from public.bookings)         as bookings,
  (select count(*) from public.payments)         as payments,
  (select count(*) from public.reviews)          as reviews,
  (select count(*) from public.disputes)         as disputes,
  (select count(*) from public.referral_credits) as referral_credits,
  (select count(*) from public.payouts)          as payouts,
  (select count(*) from public.paystack_events)  as paystack_events,
  (select count(*) from public.slot_locks)       as slot_locks,
  (select count(*) from public.sms_jobs)         as sms_jobs,
  (select count(*) from public.email_jobs)       as email_jobs,
  (select count(*) from public.coaches)          as coaches_untouched,
  (select count(*) from public.players)          as players_untouched,
  (select count(*) from public.profiles)         as profiles_untouched;
