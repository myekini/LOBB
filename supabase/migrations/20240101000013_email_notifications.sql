-- Transactional email foundation for non-auth notifications.
-- Auth OTP remains SMS/WhatsApp; product lifecycle messages can use Resend.

alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists email_notifications_enabled boolean not null default true,
  add column if not exists marketing_emails_enabled boolean not null default false;

alter type public.sms_job_type add value if not exists 'admin_digest';

create unique index if not exists profiles_email_lower_unique_idx
  on public.profiles (lower(email))
  where email is not null;

create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  type public.sms_job_type not null,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  preview text,
  html text not null,
  text text not null,
  booking_id uuid references public.bookings(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete set null,
  scheduled_for timestamptz not null default now(),
  status public.sms_job_status not null default 'pending',
  provider_message_id text,
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists email_jobs_due_idx
  on public.email_jobs(status, scheduled_for);

create index if not exists email_jobs_booking_type_idx
  on public.email_jobs(booking_id, type);

create unique index if not exists email_jobs_booking_type_unique_idx
  on public.email_jobs(booking_id, type)
  where booking_id is not null;

alter table public.email_jobs enable row level security;

drop policy if exists "Admins manage email jobs" on public.email_jobs;
create policy "Admins manage email jobs"
on public.email_jobs for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
