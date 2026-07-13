-- Fix dead payout pipeline: the release-escrow cron selects bookings with
-- status='confirmed' whose session ended 2+ hours ago, but release_escrow()
-- only accepted status='completed' — and nothing ever set 'completed'.
-- Every release raised "not eligible", so escrow was never released and coach
-- transfers (which require completed + escrow_released_at) never ran.
--
-- release_escrow now performs the transition itself: confirmed → completed
-- with escrow_released_at stamped, and stays idempotent-safe for bookings
-- already completed but not yet released.

create or replace function public.release_escrow(p_booking_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bookings
  set status = 'completed',
      escrow_released_at = now()
  where id = p_booking_id
    and status in ('confirmed', 'completed')
    and escrow_released_at is null
    and ends_at <= now();

  if not found then
    raise exception 'Booking % not eligible for escrow release', p_booking_id;
  end if;
end;
$$;
