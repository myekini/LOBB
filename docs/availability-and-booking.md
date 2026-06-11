# LOBB Feature Documentation

## Manage Availability

### Overview

Coaches set when they are available to be booked. The system has two layers: a **weekly template** (hours that repeat every week) and **one-off date overrides** (specific days the coach wants to close). Players see generated 60-minute slots derived from these layers, up to 14 days ahead.

---

### Data model

| Table | What it stores |
| --- | --- |
| `coach_availability` | Weekly recurring windows, e.g. `{ day_of_week: 1, starts_at: "09:00:00", ends_at: "17:00:00" }` = every Monday 9am–5pm |
| `coach_availability_blocks` | Full-day overrides, e.g. `{ blocked_date: "2026-06-15" }` = close June 15 entirely |
| `bookings` | Confirmed/pending bookings that automatically block their slot (+ 15 min buffer each side) |

---

### How slots are generated (server-side RPC)

`get_coach_available_slots(p_coach_id)` runs in Supabase with `timezone = 'Africa/Lagos'`. It:

1. Generates dates from today → today + 14
2. For each date, finds matching weekly windows by day-of-week
3. Walks each window in 60-minute steps to produce raw slots
4. Filters out any slot that is:
   - Within 24 hours of now
   - On a full-day blocked date
   - Overlapping an active slot lock (player currently in checkout)
   - Overlapping an existing booking ±15 min

The ±15 min booking buffer means a 10am booking silently removes the 9am and 11am slots from player view too.

---

### UI (`/coach/availability`)

Two sections, one page, no view-toggle.

#### Section 1 — Weekly hours

- Day toggles (Sun–Sat) with Mon–Fri, Weekend, Every day presets
- "From / Until" time pickers + **Apply** button — sets the chosen hours on all selected days at once (replaces, not merges)
- Per-day list showing every day's current hours with inline edit (time pickers + trash button) and a + button to add a second window per day

#### Section 2 — Days off

- Month calendar with prev/next navigation
- Tap any future date to close it (turns red with strikethrough)
- Tap a closed date to reopen it
- Green dot on each date = weekly hours are set for that weekday
- Closed dates listed as removable pills below the calendar
- Past dates are greyed out and non-interactive

**Save:** sticky footer button. All edits are local until saved. PUT `/api/coaches/me/availability` does a full replace (delete all → insert new) for weekly slots and blocked dates.

---

### Known constraints

- Players only see 14 days ahead regardless of how far out availability is set
- The 24h advance booking rule means today's slots are never shown to players
- A booking at 10am blocks the 9am and 11am slots for players (±15 min buffer) — intentional to avoid back-to-back sessions with no travel time

---

### Source files

| File | Purpose |
| --- | --- |
| [src/app/coach/availability/page.tsx](src/app/coach/availability/page.tsx) | Full availability UI |
| [src/app/api/coaches/me/availability/route.ts](src/app/api/coaches/me/availability/route.ts) | GET (load) + PUT (full replace save) |
| [supabase/migrations/20260529000001_slots_exclude_active_locks.sql](supabase/migrations/20260529000001_slots_exclude_active_locks.sql) | Latest `get_coach_available_slots` RPC |

---

## Booking Flow

### Overview

The booking flow is a 3-step process that lets a player reserve a 60-minute private coaching session with a verified coach, pick a court, and pay securely via Paystack. A slot lock prevents double-booking during checkout.

---

### Step 1 — Pick a slot (`/book/[coachSlug]/step-1`)

1. Fetches the coach profile and available slots in parallel on load.
2. Slots are grouped by day and shown in a 7-day scrollable calendar. Navigation arrows move forward/back one week (up to 2 weeks out).
3. Slots within 24 hours of the current time are greyed out and unselectable (24h advance booking rule).
4. Player selects a day then a time, then taps **Continue**.
5. **POST `/api/bookings/lock`** is called:
   - Re-confirms the slot is still available in the DB.
   - Inserts a row into `slot_locks` — a **10-minute exclusive hold** on that slot for this player.
   - A unique constraint on `(coach_id, slot_starts_at)` prevents two players locking the same slot.
   - Returns `lock_id` and `expires_at`.
6. Player is navigated to Step 2 with `slot`, `lock_id`, and `expires_at` in the URL query string.

---

### Step 2 — Pick a court (`/book/[coachSlug]/step-2`)

1. A **live countdown timer** initialised from `expires_at` counts down the 10-minute lock window. At zero, the player is redirected back to the coach page (`?timeout=slot`). A warning toast fires at 2 minutes remaining.
2. Player picks a venue in one of two modes:
   - **Suggested** — curated list of Lagos tennis courts filtered to the coach's service areas.
   - **Custom** — free-text address the player types in.
3. **National Stadium special handling:** selecting it reveals a sub-picker for the specific court:
   - Front Courts (Members) — only accessible on weekdays before 4pm. Greyed out otherwise.
   - Center Court — always available.
   - Back Courts — always available.
4. Player can optionally add a note to the coach (injury, focus area, etc.).
5. **Review booking** encodes all selections into URL params and navigates to Step 3. Nothing is written to the DB at this step.

---

### Step 3 — Review & pay (`/book/[coachSlug]/step-3`)

1. Shows a full summary: coach identity, session date/time, location, and fee breakdown.
2. Fee breakdown:
   - Session fee = coach's `hourly_rate_ngn`
   - LOBB service fee = 5% of session fee (charged to the player on top)
   - Total = session fee + service fee
3. The 10-minute countdown continues here. A toast fires at 2 minutes remaining.
4. Tapping **Pay** calls **POST `/api/bookings`**:
   - Validates auth, player profile, and slot lock (not expired, not already used).
   - Confirms coach is `active` and has a `paystack_subaccount_code`.
   - Checks for court double-booking at National Stadium.
   - Calculates the split: 15% commission to LOBB, 85% payout to coach.
   - Inserts a `bookings` row (`status: pending`) and a `payments` row.
   - Initialises a Paystack transaction with the subaccount split config.
   - Returns `paystack_url`.
5. Browser redirects to `paystack_url` — payment happens on Paystack's hosted page.
6. Paystack redirects back to `/book/confirm?reference=...`.

---

### After Payment — Confirm (`/book/confirm`)

1. **GET `/api/payments/verify?reference=...`** is called.
2. Looks up the payment record in the DB first — if the Paystack webhook already fired and marked it `paid`, the booking is confirmed immediately.
3. If not yet confirmed, calls Paystack directly to verify the transaction status.
4. On success (`status: success`):
   - Marks payment as `paid`, booking as `confirmed`.
   - Deletes the `slot_locks` row.
   - Reserves the court slot in `court_slot_bookings` (National Stadium double-booking prevention).
   - Sends confirmation SMS to both player and coach.
   - Sends confirmation and receipt emails.
   - Queues 24h reminder emails and a post-session review request.
   - Uses an idempotency guard (`paystack_events` upsert) so concurrent verify calls don't send duplicate notifications.
5. On failure (`status: abandoned` or `failed`):
   - Cancels the booking, cleans up the lock.
   - Sends a payment failed email.
   - Returns `PAYMENT_FAILED (402)`.
6. If Paystack is unreachable, returns the current booking state so the client can retry.

---

### Money flow (Paystack subaccount split)

```text
Player pays: session fee + 5% convenience fee
    ├── 85% of session fee → Coach's bank account (Paystack subaccount)
    └── 15% of session fee + convenience fee → LOBB's Paystack account
```

Money routes directly to the coach's bank account via Paystack's split payment feature. LOBB never holds a pool. The coach must complete bank setup (`/auth/setup/coach/bank` or `/coach/settings/bank`) before they can receive bookings.

---

### Guard rails

| Rule | Enforced in | Error code |
| --- | --- | --- |
| Slot must be at least 24h away | Lock API + UI | `BOOKING_SLOT_TOO_SOON` |
| Slot must be within 14 days | Lock API | `BOOKING_SLOT_TOO_FAR` |
| Slot must not already be locked | Lock API (DB unique constraint) | `BOOKING_SLOT_TAKEN` |
| Player must have a completed profile | Lock API + Booking API | `BOOKING_PROFILE_REQUIRED` |
| Coach must be `active` | Lock API + Booking API | `BOOKING_COACH_UNAVAILABLE` |
| Coach must have a Paystack subaccount | Booking API | `BOOKING_PAYMENT_ACCOUNT_MISSING` |
| National Stadium court must not be double-booked | Booking API + Verify API | `BOOKING_COURT_TAKEN` |
| Slot lock must not be expired | Booking API | `BOOKING_LOCK_EXPIRED` |
| Slot lock must not already be used (booking attached) | Booking API | `BOOKING_LOCK_INVALID` |

---

### Booking source files

| File | Purpose |
| --- | --- |
| [src/app/book/[coachSlug]/step-1/page.tsx](src/app/book/[coachSlug]/step-1/page.tsx) | Slot picker UI |
| [src/app/book/[coachSlug]/step-2/page.tsx](src/app/book/[coachSlug]/step-2/page.tsx) | Court picker UI, countdown timer |
| [src/app/book/[coachSlug]/step-3/page.tsx](src/app/book/[coachSlug]/step-3/page.tsx) | Review, fee summary, payment trigger |
| [src/app/book/confirm/page.tsx](src/app/book/confirm/page.tsx) | Post-payment confirmation page |
| [src/app/api/bookings/lock/route.ts](src/app/api/bookings/lock/route.ts) | Slot lock API |
| [src/app/api/bookings/route.ts](src/app/api/bookings/route.ts) | Booking creation + Paystack init |
| [src/app/api/payments/verify/route.ts](src/app/api/payments/verify/route.ts) | Payment verification + confirmation logic |
| [src/app/api/bookings/webhook/route.ts](src/app/api/bookings/webhook/route.ts) | Paystack webhook handler |
| [src/lib/paystack.ts](src/lib/paystack.ts) | Paystack SDK wrapper |
| [src/lib/app-errors.ts](src/lib/app-errors.ts) | Error code definitions |
