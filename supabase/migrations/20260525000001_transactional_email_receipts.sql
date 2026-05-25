-- LOBB receipt and payment lifecycle email job types.

alter type public.payment_status add value if not exists 'partial_refund';

alter type public.sms_job_type add value if not exists 'booking_payment_receipt_player';
alter type public.sms_job_type add value if not exists 'payment_failed_player';
alter type public.sms_job_type add value if not exists 'refund_issued_player';
alter type public.sms_job_type add value if not exists 'booking_rescheduled_player';
alter type public.sms_job_type add value if not exists 'booking_rescheduled_coach';
alter type public.sms_job_type add value if not exists 'waitlist_update_player';
alter type public.sms_job_type add value if not exists 'trial_confirmed_player';
