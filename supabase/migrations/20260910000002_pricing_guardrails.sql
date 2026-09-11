-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing guardrails — DB backstop for the central pricing system.
-- Mirrors src/lib/config/pricing.ts (LOBB_PRICING.coach): a listed coach rate
-- must sit in ₦5,000–₦75,000 and land on a ₦500 increment. NULL stays allowed
-- for coaches still in draft onboarding.
--
-- bookings.hourly_rate_ngn is deliberately left loose — it is the historical
-- record of the rate at booking time and must never be re-validated.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the old floor-only constraint (auto-named by its inline definition).
alter table public.coaches
  drop constraint if exists coaches_hourly_rate_ngn_check;

-- Snap any pre-existing out-of-band rates into the new band + increment so the
-- constraint below can be added without failing on legacy rows.
update public.coaches
set hourly_rate_ngn = least(75000, greatest(5000, (round(hourly_rate_ngn / 500.0) * 500)::int))
where hourly_rate_ngn is not null
  and (hourly_rate_ngn < 5000 or hourly_rate_ngn > 75000 or hourly_rate_ngn % 500 <> 0);

-- Postgres has no "add constraint if not exists" — guard it by name so this
-- migration can be replayed (the CI pipeline re-runs every file on every
-- push) without failing on a constraint that's already there.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coaches_hourly_rate_band_check'
  ) then
    alter table public.coaches
      add constraint coaches_hourly_rate_band_check
      check (
        hourly_rate_ngn is null
        or (
          hourly_rate_ngn >= 5000
          and hourly_rate_ngn <= 75000
          and hourly_rate_ngn % 500 = 0
        )
      );
  end if;
end $$;
