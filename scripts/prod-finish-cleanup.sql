-- Production: finish applying 20260714000001_db_cleanup.sql.
--
-- Audit found the paystack_subaccount_code column was already dropped, but
-- otp_verifications was NOT — the migration only partially landed on an
-- earlier run. This completes it. Safe to run any number of times.

drop function if exists public.cleanup_expired_otps();
drop table if exists public.otp_verifications;
