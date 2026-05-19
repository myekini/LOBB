-- 8.1 / 10  Rejection count tracking for coach approval flow
-- After 3 rejections the coach must contact admin directly instead of resubmitting

alter table public.coaches
  add column if not exists rejection_count integer not null default 0,
  add column if not exists needs_direct_contact boolean not null default false;
