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
