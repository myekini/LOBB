# Booking

Three-step flow from a coach's public profile to a paid, confirmed session.
For how availability itself is modelled (weekly windows, blocked dates, slot
generation SQL), see [availability-and-booking.md](../availability-and-booking.md).

## Slot discovery

- `GET /api/coaches/[slug]/slots` calls the `get_available_slots` SQL
  function: weekly windows − blocked dates − granular slot blocks − existing
  bookings − active slot locks, minimum 24h in the future, 14-day horizon.
- The coach profile page groups slots by day; picking one starts the flow.

## Step 1 — hold the slot (`/book/[coachSlug]/step-1`)

`POST /api/bookings/lock` writes a `slot_locks` row (coach, starts_at,
player, expires_at = **10 minutes**). The lock:
- prevents double-booking the same slot while someone is checking out,
- is surfaced in the UI as a countdown; at 2 minutes remaining a warning
  toast fires; at 0 the player is bounced back to the profile with
  `?timeout=slot`.
Expired locks are ignored by `get_available_slots` and cleaned up lazily.

## Step 2 — location & notes (`/book/[coachSlug]/step-2`)

Court choice adapts to the coach's `court_access`:

| court_access | Player sees |
|---|---|
| coach has courts (`courts_worked_with` set) | "Coach's session courts" — only those courts |
| `player_arranges` | "Choose your court" — all Lagos courts + custom venue emphasised |
| `coach_can_recommend` | All courts + "ask your coach for a recommendation" |

Selection (court id or custom text) and an optional note are carried to step 3
via query params along with the lock id.

## Step 3 — review & pay (`/book/[coachSlug]/step-3`)

1. Player reviews the summary (slot, venue, price breakdown) and accepts the
   cancellation-policy consent checkbox.
2. `POST /api/bookings` (auth required, player role):
   - Re-validates the lock belongs to this player and hasn't expired.
   - Computes money server-side (never trusts client amounts):
     `gross = hourly_rate`, `convenience_fee` (player-side),
     `platform_commission` (15% coach-side), `coach_payout = gross − commission`,
     `total_amount = gross + convenience_fee`.
   - Inserts `bookings` (status **pending**) + `payments` (status **pending**)
     with a generated `booking_ref` (LOBB-YYYYMMDD-XXXX) and Paystack
     reference, then calls Paystack `transaction/initialize`.
   - Returns the `authorization_url`; the client redirects to Paystack checkout.
3. Payment confirmation is dual-path (webhook + verify-on-return) — see
   [payments.md](payments.md). On success the booking flips to **confirmed**
   and both sides get confirmation emails.

## Booking lifecycle

```
pending ── paid (webhook/verify) ──▶ confirmed ──▶ session happens
   │                                     │
   │ unpaid 30+ min                      │ nightly release-escrow cron
   ▼                                     ▼
cancelled (expire cron)              completed + escrow_released_at
                                         │ transfer to coach's bank
                                     disputed ⇄ (admin resolution)
```

- `expire-pending-bookings` cron cancels stale unpaid bookings so locks/slots
  free up.
- `release-escrow` cron (see payments.md) completes ended sessions and pays
  coaches.
- Either party can cancel a pending/confirmed booking
  (`POST /api/bookings/[id]/cancel`) under the policy: free until 24h before
  the session; within 24h a 50% fee applies (player-side); coach cancellations
  always refund the player 100%. Refunds go back through Paystack
  automatically.

## Reviews

After a booking reaches **completed**, the player can leave a rating/comment
(`/api/reviews`, one per booking, enforced server-side). Aggregates feed
`coach_profiles_public.avg_rating` / `review_count`.
