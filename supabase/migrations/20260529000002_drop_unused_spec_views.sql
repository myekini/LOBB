-- Drop spec-alignment views that were created in migrations 006/007 as a
-- "canonical tables + alias views" pattern. None of these views are queried
-- anywhere in the application code (verified by grep across src/). All
-- underlying tables remain intact — this only removes the view layer.
--
-- Confirmed unused (no .from("view_name") references in src/):
--   availability_slots  → alias of coach_availability
--   blocked_dates       → alias of coach_availability_blocks
--   booking_records     → alias of bookings (with status remapping)
--   review_records      → alias of reviews
--   notifications       → alias of sms_jobs
--   users               → alias of profiles
--   coach_profiles      → alias of coaches (with joins)
--
-- Still in use (NOT dropped):
--   coach_profiles_public   → heavily used by discovery / coach listing pages
--   public_reviews          → used by review display routes
--   coach_earnings_summary  → used by earnings dashboard
--   admin_core_metrics      → used by admin dashboard

drop view if exists public.availability_slots;
drop view if exists public.blocked_dates;
drop view if exists public.booking_records;
drop view if exists public.review_records;
drop view if exists public.notifications;
drop view if exists public.users;
drop view if exists public.coach_profiles;
