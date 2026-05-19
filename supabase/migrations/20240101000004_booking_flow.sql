-- 2.5 / 2.6  Booking flow & escrow

-- ─── Slot locks ───────────────────────────────────────────────────────────────
-- Prevents double-booking during the 10-minute checkout window.
create table if not exists public.slot_locks (
  id            uuid        primary key default gen_random_uuid(),
  coach_id      uuid        not null references public.coaches(id) on delete cascade,
  slot_starts_at timestamptz not null,
  locked_by     uuid        not null references public.profiles(id) on delete cascade,
  booking_id    uuid        references public.bookings(id) on delete set null,
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  created_at    timestamptz not null default now(),
  -- One active lock per coach/slot at a time
  constraint slot_locks_coach_slot_unique unique(coach_id, slot_starts_at)
);

create index if not exists slot_locks_expires_idx   on public.slot_locks(expires_at);
create index if not exists slot_locks_locked_by_idx on public.slot_locks(locked_by);

alter table public.slot_locks enable row level security;

drop policy if exists "Players can read their own slot locks" on public.slot_locks;
create policy "Players can read their own slot locks"
on public.slot_locks for select
to authenticated
using (locked_by = auth.uid());

drop policy if exists "Players can create slot locks" on public.slot_locks;
create policy "Players can create slot locks"
on public.slot_locks for insert
to authenticated
with check (locked_by = auth.uid());

drop policy if exists "Players can delete their own slot locks" on public.slot_locks;
create policy "Players can delete their own slot locks"
on public.slot_locks for delete
to authenticated
using (locked_by = auth.uid());

-- ─── Paystack event idempotency ────────────────────────────────────────────────
-- Ensures each webhook event is processed exactly once.
create table if not exists public.paystack_events (
  id           uuid        primary key default gen_random_uuid(),
  event        text        not null,
  reference    text        not null unique,
  payload      jsonb       not null,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);
-- No client RLS needed; only service-role writes this table.

-- ─── Bookings: cancellation + escrow columns ─────────────────────────────────
alter table public.bookings
  add column if not exists cancelled_by        text        check (cancelled_by in ('player', 'coach', 'admin')),
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists escrow_released_at  timestamptz;

-- ─── Coaches: strike counter ──────────────────────────────────────────────────
alter table public.coaches
  add column if not exists strike_count integer not null default 0;

-- ─── Helper function: auto-release escrow ─────────────────────────────────────
-- Called externally (cron / edge function) for bookings where
-- session_ends_at + 2 hours has passed and escrow has not yet been released.
-- In MVP this is triggered from the Paystack webhook side after session time.
-- The function marks the booking 'completed' and records the release timestamp.
create or replace function public.release_escrow(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set
    status             = 'completed',
    escrow_released_at = now()
  where id = p_booking_id
    and status = 'confirmed'
    and ends_at + interval '2 hours' <= now()
    and escrow_released_at is null;
end;
$$;
