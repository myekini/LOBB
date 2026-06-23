create table if not exists public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_name text not null check (
    document_name in (
      'terms_of_service',
      'privacy_policy',
      'cancellation_policy',
      'coach_agreement',
      'identity_verification_consent',
      'coach_profile_accuracy',
      'coach_code_of_conduct'
    )
  ),
  document_version text not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.consent_logs enable row level security;

create index if not exists consent_logs_user_id_idx
  on public.consent_logs(user_id);

create index if not exists consent_logs_document_idx
  on public.consent_logs(document_name, document_version);

comment on table public.consent_logs is 'Audit trail of user acceptance for legal documents and sensitive-data consent.';
comment on column public.consent_logs.document_version is 'Legal document effective version, e.g. 2026-06.';
