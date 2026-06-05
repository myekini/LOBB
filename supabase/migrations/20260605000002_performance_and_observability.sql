-- ── Fix 7: Failed transfer observability ──────────────────────────────────────
-- Records the last Paystack error when a coach payout transfer fails so admins
-- can see exactly why a transfer is stuck without reading logs.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS transfer_last_error text;

-- ── Fix 8: Performance indexes ────────────────────────────────────────────────

-- Escrow release cron:
--   WHERE status = 'confirmed' AND ends_at <= ? AND escrow_released_at IS NULL
CREATE INDEX IF NOT EXISTS bookings_escrow_release_idx
  ON public.bookings (status, ends_at)
  WHERE status = 'confirmed' AND escrow_released_at IS NULL;

-- Transfer retry query (cron + admin trigger):
--   WHERE status = 'completed' AND escrow_released_at IS NOT NULL AND paystack_transfer_code IS NULL
CREATE INDEX IF NOT EXISTS bookings_pending_transfer_idx
  ON public.bookings (status, coach_id)
  WHERE status = 'completed' AND paystack_transfer_code IS NULL;

-- Slot availability function — active lock lookup:
--   WHERE coach_id = ? AND slot_starts_at = ? AND expires_at > now()
CREATE INDEX IF NOT EXISTS slot_locks_coach_slot_idx
  ON public.slot_locks (coach_id, slot_starts_at, expires_at);

-- Slot availability function — availability window lookup:
--   WHERE coach_id = ? AND is_active = true
CREATE INDEX IF NOT EXISTS coach_availability_coach_active_idx
  ON public.coach_availability (coach_id)
  WHERE COALESCE(is_active, true) = true;

-- Slot availability function — date block lookup:
--   WHERE coach_id = ? AND blocked_date = ?
CREATE INDEX IF NOT EXISTS coach_availability_blocks_coach_date_idx
  ON public.coach_availability_blocks (coach_id, blocked_date);

-- Slot availability function — slot block overlap lookup:
--   WHERE coach_id = ? AND slot_starts_at/ends_at overlap
CREATE INDEX IF NOT EXISTS coach_slot_blocks_coach_range_idx
  ON public.coach_availability_slot_blocks (coach_id, slot_starts_at, slot_ends_at);

-- Admin and OTP lookup by email
CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (email)
  WHERE email IS NOT NULL;
