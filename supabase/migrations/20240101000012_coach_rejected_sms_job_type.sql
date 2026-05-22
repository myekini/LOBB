-- Keep coach approval/rejection notifications aligned with the API.
-- The admin decision endpoint queues this when a profile is rejected.

alter type public.sms_job_type add value if not exists 'coach_rejected';
