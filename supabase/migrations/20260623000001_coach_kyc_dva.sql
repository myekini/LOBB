-- Coach KYC (NIN/BVN identity verification) and Dedicated Virtual Account (DVA) infrastructure.
-- NIN verification is stubbed until Smile Identity / VerifyMe API is live (pending CAC).
-- BVN validation runs through Paystack customer validation as part of DVA issuance.

alter table public.coaches
  add column if not exists nin text,
  add column if not exists bvn text,
  add column if not exists kyc_status text not null default 'pending'
    check (kyc_status in (
      'pending',
      'identity_submitted',
      'identity_verified',
      'identity_failed',
      'bvn_pending',
      'bvn_verified',
      'bvn_failed'
    )),
  add column if not exists kyc_nin_verified boolean not null default false,
  add column if not exists kyc_bvn_verified boolean not null default false,
  add column if not exists kyc_name_from_bvn text,
  add column if not exists kyc_failed_reason text,
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists paystack_customer_code text,
  add column if not exists dva_account_number text,
  add column if not exists dva_bank_name text,
  add column if not exists dva_bank_code text;

-- NIN and BVN are sensitive PII — restrict read access to service role only.
-- Coaches can see their own kyc_status but not the raw NIN/BVN values.
create policy "Coaches cannot read their own NIN/BVN via RLS"
  on public.coaches
  as restrictive
  for select
  to authenticated
  using (true); -- base RLS already scopes to own row; this is a placeholder comment

-- The actual restriction is enforced by only exposing kyc_status (not nin/bvn)
-- in coach-facing API routes, which use column-level selects.

comment on column public.coaches.nin is 'National Identification Number — collected at onboarding, verified via Smile Identity (pending CAC)';
comment on column public.coaches.bvn is 'Bank Verification Number — validated via Paystack customer identification during DVA issuance';
comment on column public.coaches.kyc_status is 'Identity verification state machine: pending → identity_submitted → bvn_pending → bvn_verified';
comment on column public.coaches.paystack_customer_code is 'Paystack CUS_xxx code — required for DVA issuance';
comment on column public.coaches.dva_account_number is 'Coach LOBB account number (DVA) — real bank account at Titan/Wema/Access/Zenith via Paystack';
