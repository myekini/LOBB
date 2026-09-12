-- Admin coach suspend/unsuspend never emailed the coach — only approve/reject
-- did (see /api/admin/coaches/[id]/decision). The email pipeline reuses the
-- sms_job_type enum (public.sms_job_type — "type identifies the
-- communication event, not channel", per its own comment in the schema) to
-- tag email_jobs rows, and it never had values for these two actions.
--
-- ADD VALUE IF NOT EXISTS is safe to replay and doesn't need the
-- exception-swallowing do-block pattern used for CREATE TYPE elsewhere in
-- this repo — it's already idempotent on its own.
alter type public.sms_job_type add value if not exists 'coach_suspended';
alter type public.sms_job_type add value if not exists 'coach_reactivated';
