-- Drop NOT NULL from fields that are filled across multiple onboarding steps.
-- A coach row is created at step 1 (draft) before bio/rate/location are collected.
-- The check constraint on hourly_rate_ngn still applies when a value is provided.

alter table public.coaches
  alter column bio           drop not null,
  alter column hourly_rate_ngn drop not null,
  alter column primary_location drop not null;
