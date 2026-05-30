-- Notify coaches when a player starts payment for a locked slot.

alter type public.sms_job_type add value if not exists 'booking_payment_initiated_coach';
