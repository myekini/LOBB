-- Encrypt NIN/BVN at rest.
--
-- Adds new columns for app-level AES-256-GCM ciphertext (see src/lib/crypto.ts).
-- Deliberately additive and non-destructive:
--   - coaches.nin / coaches.bvn (plain text) are left untouched here
--   - a one-off script (scripts/backfill-kyc-encryption.ts) copies existing
--     plaintext values into the new encrypted columns
--   - the app is switched over in this same deploy to read/write only the
--     encrypted columns going forward (see /api/coaches/kyc, /api/coaches/bank)
--   - dropping the old plaintext columns is a deliberate follow-up migration,
--     run only after the backfill + a spot-check in each environment

alter table public.coaches
  add column if not exists nin_encrypted text,
  add column if not exists bvn_encrypted text;

comment on column public.coaches.nin_encrypted is
  'AES-256-GCM ciphertext of the coach NIN, encrypted app-side (src/lib/crypto.ts). Never read/written via PostgREST directly — only through /api/coaches/kyc.';
comment on column public.coaches.bvn_encrypted is
  'AES-256-GCM ciphertext of the coach BVN, encrypted app-side (src/lib/crypto.ts). Decrypted only server-side in /api/coaches/bank for the Paystack customer-validation call.';

-- Superseded by nin_encrypted / bvn_encrypted. Drop once the backfill has run
-- and been spot-checked in this environment:
--   alter table public.coaches drop column nin;
--   alter table public.coaches drop column bvn;
