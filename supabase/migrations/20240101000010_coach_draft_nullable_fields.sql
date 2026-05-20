-- Draft coach profiles should not need fake public values while onboarding.
alter table public.coaches
  alter column bio drop not null,
  alter column hourly_rate_ngn drop not null,
  alter column primary_location drop not null;

alter table public.coaches
  drop constraint if exists coaches_hourly_rate_ngn_check,
  add constraint coaches_hourly_rate_ngn_check
    check (hourly_rate_ngn is null or hourly_rate_ngn >= 1000);
