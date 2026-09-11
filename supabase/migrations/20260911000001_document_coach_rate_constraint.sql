-- Pipeline smoke test: a small, fully inert change to prove the migration CI
-- end to end (push -> CI picks up the new file -> applies it to the right
-- project). Also genuinely useful: documents the rate guardrail in the DB
-- itself, visible to anyone browsing the schema in Supabase Studio.

comment on constraint coaches_hourly_rate_band_check on public.coaches is
  'Mirrors LOBB_PRICING.coach in src/lib/config/pricing.ts — floor 5000, ceiling 75000, 500 step. Keep both in sync.';
