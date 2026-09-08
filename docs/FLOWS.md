# LOBB product flows`r`n`r`nThis is the canonical reference for authentication, booking, availability, payments, KYC, referrals, reviews, and disputes.`r`n

---


# Authentication

Passwordless email OTP via Supabase Auth. No passwords anywhere in the system.

## Signup

1. `/auth/signup/player` or `/auth/signup/coach` (or the generic `/auth/login?mode=signup` with role tabs).
   User enters email and accepts the legal checkboxes (Terms + Privacy, Cancellation & Refund).
2. Client calls `POST /api/auth/send-otp` with `{ email, role }`.
   - Signup mode uses `shouldCreateUser: true`; the chosen role is stored in
     `raw_user_meta_data.role`.
   - Supabase generates a **6-digit** code (dashboard: Authentication → Email →
     "Email OTP Length" — must match `NEXT_PUBLIC_OTP_LENGTH`).
   - The send-email auth hook (`/api/auth/email-hook`, secured with
     `SUPABASE_EMAIL_HOOK_SECRET`) delivers the code via Resend.
3. The pending request (email, mode, role, sentAt, accepted documents) is kept
   in `sessionStorage` (`lib/auth-flow.ts`) and the user lands on `/auth/verify`.
4. User enters the code → `POST /api/auth/verify-otp`:
   - Verifies via `supabase.auth.verifyOtp` and returns the session tokens.
   - Reads the `lobb_ref` referral cookie and stamps
     `profiles.referred_by_coach_id` (first touch only — never overwritten).
   - Client sets the session, records legal consent (`POST /api/legal/consent`
     → `consent_logs`), and routes by role (see Routing below).

### Database side of signup

`handle_new_user()` — an `AFTER INSERT` trigger on `auth.users` — creates:
- a `profiles` row (role from metadata; `full_name` **stays null** — a null
  name means "onboarding incomplete" and drives routing),
- a `coaches` row (status `draft`) or `players` row.

The whole trigger body is wrapped in an exception handler: a failure creating
public rows must never block the auth user itself. Two historical bugs to
never reintroduce here:
- deriving `full_name` from the email prefix (skips onboarding routing), and
- unqualified function calls (e.g. `gen_random_bytes`) inside downstream
  triggers — `supabase_auth_admin`'s search_path is only `auth`, so calls that
  work from the API explode inside signup. Use `pg_catalog` functions or
  schema-qualify everything.

## Login

Same flow with `shouldCreateUser: false`. If the email has no account,
send-otp returns **404** and the UI shows an inline "no account — sign up as
player / coach" alert with the email carried over. Codes are rate-limited by
Supabase (60s resend cooldown → surfaced as 429 with a friendly message).

## Verify-page routing

After a successful verify, `/auth/verify` routes by profile state:

| Profile state | Destination |
|---|---|
| coach + has full_name | `/coach/dashboard` |
| coach, no full_name | `/auth/setup/coach/1` (6-step onboarding) |
| player + has full_name | `/home` |
| player, no full_name | `/auth/setup/player` |
| admin | `/admin` |
| no profile row (trigger failed) | client-side upsert from intended role, then setup |
| no role and no intent | `/auth/role` picker |

A `?next=` path is honoured only if it passes `getSafeNextPath` (must be a
relative path and consistent with the user's role).

## Session & route protection

`src/middleware.ts` → `lib/supabase/middleware.ts` refreshes the Supabase
session cookie on every request and enforces role-based route groups:
`/admin/*` (admin), `/coach/*` (coach/admin), player areas (`/home`,
`/dashboard`, `/book`…). Logged-in users hitting `/` are bounced to their
dashboard. API routes never trust the client: `requireRole` / `withRole`
(`lib/api-auth.ts`) re-resolve the user and role server-side per request.

## Dev/test access

With `LOBB_ENABLE_TEST_OTP=true`, the seeded test accounts
(+2340000000001 player, +2340000000002 coach) accept a fixed OTP for local
testing. Never enable in production.

## Environment knobs

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_OTP_LENGTH` | Number of OTP boxes; must equal the Supabase dashboard setting (6) |
| `SUPABASE_EMAIL_HOOK_SECRET` | Verifies the auth send-email hook |
| `RESEND_API_KEY`, `EMAIL_FROM` | Delivery of OTP + transactional email |
| `ADMIN_EMAILS` | Bootstrap list for admin role assignment |


---


# Booking

Availability setup and slot-generation details are maintained in [availability-and-booking.md](availability-and-booking.md). This document is the canonical player booking lifecycle reference.

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


---


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


---


# Payments

Money model: **charge the player up front, hold in LOBB's Paystack balance
while the session is at risk, pay the coach after the session completes.**
No wallets, no stored value — refunds go back to the player's payment method,
payouts go directly to the coach's own bank account.

## Money fields on a booking

| Field | Meaning |
|---|---|
| `hourly_rate_ngn` / `gross_amount` | Coach's session price |
| `convenience_fee_ngn` | Player-side fee added at checkout |
| `platform_commission_ngn` | 15% of gross, deducted from the coach side |
| `coach_payout_ngn` | gross − commission → what the coach receives |
| `total_amount_ngn` | gross + convenience fee → what the player pays |

All amounts are computed **server-side** in `POST /api/bookings`; the client
never supplies money values. Paystack works in kobo (`× 100`).

## Charge (player pays)

1. `POST /api/bookings` initializes a Paystack transaction with the booking's
   reference and returns `authorization_url`.
2. Player completes checkout on Paystack (card / bank transfer / USSD).
3. Confirmation is **dual-path** (idempotent — whichever lands first wins):
   - **Webhook** `POST /api/payments/webhook`: verifies the
     `x-paystack-signature` HMAC against the raw body, records the event in
     `paystack_events` (dedupe by event id), and on `charge.success` marks
     `payments.status = paid`, `bookings.status = confirmed`.
   - **Verify-on-return** `GET /api/payments/verify?reference=…`: called by
     the return page; hits Paystack's verify endpoint and applies the same
     transition if the webhook hasn't already.
4. Confirmation emails go to player and coach; reminder jobs are scheduled.

`PAYSTACK_WEBHOOK_SECRET` must be the **secret key** (`sk_…`) — Paystack
signs webhooks with it. The webhook URL must be registered in the Paystack
dashboard for the live domain.

## Escrow release & coach payout (cron)

`GET /api/cron/release-escrow` (nightly via Vercel cron; auth: `CRON_SECRET`
or `ADMIN_SECRET` — see OPERATIONS.md):

1. **Release**: for every `confirmed` booking whose `ends_at` is 2+ hours in
   the past, call `release_escrow(booking_id)` — the SQL function transitions
   `confirmed → completed` and stamps `escrow_released_at` (idempotent,
   requires `ends_at <= now()`).
2. **Referral credits**: first-ever completed booking of a referred player
   mints a ₦1,500 `referral_credits` row (see referrals.md).
3. **Coach transfers**: every `completed` booking with escrow released and no
   `paystack_transfer_code` yet gets a Paystack **Transfer** of
   `coach_payout_ngn` to the coach's `paystack_recipient_code` (created when
   the coach added their verified bank). The transfer reference is
   `{payment_reference}-payout`, so retries can never double-pay (Paystack
   rejects duplicate references). Failures are recorded in
   `transfer_last_error` and retried on the next run; admins can also trigger
   payouts manually (`/api/admin/payouts/trigger`, audited).
4. **Referral payouts**: released credits are batched per coach and
   transferred once the total reaches ₦5,000.

## Refunds

`POST /api/bookings/[id]/cancel` — policy first, DB before Paystack:
1. Compute the refund percent from the cancellation policy (100% outside 24h
   or coach-cancelled; 50% inside 24h player-cancelled).
2. Mark the booking cancelled **first** (consistent state if Paystack fails).
3. Call Paystack Refund (full or partial amount in kobo). Refund failures are
   surfaced in the response and can be retried by admin.

Dispute resolutions can also trigger refunds — see
[disputes.md](disputes.md).

## Idempotency & reconciliation

- `paystack_events` stores every webhook (unique event id) — replay-safe.
- Transfers are idempotent by reference.
- `ops-alerts` cron flags anomalies (e.g. completed bookings stuck without a
  transfer) for the admin digest.

## Current gaps / roadmap

- **DVA (per-coach virtual accounts)**: scaffolding exists
  (`createDedicatedVirtualAccount`, `dva_*` columns) but is intentionally not
  the payout path. Direct transfers are cheaper, faster out of LOBB custody,
  and avoid stored-value territory. Revisit only if coaches demand a wallet.
- Transfers require a funded Paystack **Transfers** balance and a live
  (non-test) Paystack business.


---


# Coach KYC & Payout Setup

Why: LOBB moves money to individuals, so identity must be verified before
payouts — both for fraud protection and because Paystack requires validated
details to create transfer recipients. Strategy background:
[../LOBB_KYC_Payments_Referral_Brand.md](../LOBB_KYC_Payments_Referral_Brand.md).

## Onboarding path (6 steps)

1. **Profile basics** — name, photo, headline. Prefilled from the draft on
   revisit, so coaches can safely go back and edit (e.g. to fix a name that
   fails bank matching) without losing anything.
2. **Identity** — NIN + BVN (11 digits each) with explicit consent copy
   (encrypted, 5-year retention per regulation).
3. **Bio & experience.**
4. **Rate, location, player levels.**
5. **Certifications, specialisations, languages, court access + legal
   agreements** (Coach Agreement incl. 15% commission, accuracy confirmation,
   Terms/Privacy/Code of Conduct).
6. **Bank account** — searchable bank list (Paystack bank registry) +
   10-digit NUBAN. The account is resolved live via Paystack and the
   **account name must match the profile name** — mismatch is a hard stop
   with an "edit your profile name" escape hatch back to step 1.

Then: submit → admin review (`/admin/coaches`) → approve/reject (written
reason required to reject; 3 rejections escalates to direct contact).
Approval generates the referral code and sends the "profile is live" email.

## What verification actually runs today

| Layer | Status |
|---|---|
| Bank account ↔ profile name match (Paystack resolve) | **Live** — hard stop |
| NIN/BVN format + consent capture | **Live** (stored encrypted) |
| NIN/BVN identity verification via provider | **Stubbed** — pending CAC registration; wire Paystack customer validation or Smile Identity when available |
| Admin visual review of photo/bio/video | **Live** |
| Re-verification on bank change | Roadmap |

## Payout rails

- On bank save, LOBB creates a **Paystack transfer recipient**
  (`paystack_recipient_code` on the coach row). That's the payout
  destination.
- Session payouts: nightly escrow cron transfers `coach_payout_ngn` per
  completed booking (see [payments.md](payments.md)).
- Referral payouts: batched ≥ ₦5,000 (see [referrals.md](referrals.md)).
- Coaches can update their payout bank in `/coach/settings/bank` — gated
  behind KYC (BVN present) — and see their current account + history.

## DVA (Dedicated Virtual Accounts) — parked

Columns and API helpers exist (`dva_account_number`, `dva_bank_name`,
`createDedicatedVirtualAccount`), and the onboarding copy mentions a "LOBB
earnings account". **Direct transfers remain the payout path.** A DVA is a
collection alias — money "in" it sits in LOBB's Paystack balance, so it adds
custody, fees, and a withdrawal flow without removing any friction. Revisit
only if coaches demand a wallet-style balance. If shipped, it changes where
released money *lands*, not the escrow logic.


---


# Referrals

Coaches grow LOBB's player base and get paid for it: **₦1,500 per referred
player's first completed booking — with any coach, not just the referrer.**
Player-side the system is completely invisible (no banners, no different
flow); the economics are between LOBB and the coach.

## Flow

```
Coach shares lobb.ng/r/{code} (WhatsApp)
   │
   ▼
Visitor hits /r/{code}
   • 307 → the coach's public profile (/coaches/{slug})
   • sets cookie lobb_ref={CODE}, 30 days, httpOnly
   • first-touch: an existing lobb_ref cookie is NEVER overwritten
   │
   ▼
Visitor signs up → POST /api/auth/verify-otp reads the cookie and stamps
profiles.referred_by_coach_id + referred_at (permanent, once)
   │
   ▼
Referred player completes their FIRST booking (any coach)
   • release-escrow cron detects: has referred_by_coach_id, completed
     bookings count == 1, no existing credit for this user
   • inserts referral_credits: ₦1,500, status 'released'
   │
   ▼
Cron batches released credits per coach; when a coach's total ≥ ₦5,000
and they have a Paystack recipient code, one Transfer pays the batch and
the credits flip to 'paid_out'.
```

## Codes

- Generated at **approval** in the admin coach-decision route:
  lowercase name-based (`coachtobi`), 3-digit suffix on collision — friendly
  enough to say out loud in a voice note.
- The coaches-table trigger provides a random fallback for edge cases.
- All lookups are **case-insensitive** (`ilike`) so legacy mixed-case codes
  and hand-typed URLs both work.

## Anti-abuse (MVP level, deliberate)

- One credit per referred user (unique `triggering_booking_id` + explicit
  existing-credit check).
- Credit only mints on a **completed** (paid, session happened) booking —
  fake signups earn nothing.
- ₦5,000 payout threshold batches micro-payouts and blunts fake-account
  farming.
- Beyond that: manual admin review. Don't over-engineer at current volume.

## Where it shows up

- Coach dashboard: referral link card with copy + WhatsApp share.
- Coach earnings: referral earnings as a separate line item from session
  earnings.
- Admin players page: "Referred" badge on referred players.


---


# Disputes & Session Protection

Design goal: the OPay standard of trust — **reporting a problem is one tap,
the money freezes instantly, and the user always knows what happens next.**
A player should never feel they have to chase LOBB for their money.

## The player experience

1. On any paid confirmed/completed booking, the detail page shows
   **"Something wrong? Report this session."**
2. Tapping it opens a bottom sheet: pick a category
   (*coach didn't show up · session cut short · safety concern · something
   else*), add a short description, submit.
3. The moment the report lands:
   - the booking flips to `disputed`, which **freezes the coach payout** (the
     escrow cron skips disputed bookings),
   - the player sees a persistent status card: *"We're reviewing your report.
     The coach's payout is on hold — you'll hear from us within 48 hours.
     Your money is protected."*
4. After resolution the card shows the outcome in plain language (refund on
   its way / partial refund / resolved after review).

Coaches can report too (e.g. player no-show) through the same endpoint —
`player_no_show` category.

### Guardrails

- Reporting window: session start until **72 hours after the session ends**.
- One dispute per booking (DB unique constraint) — a second report gets
  "we're already on it".
- If the payout has already been transferred, freezing is impossible — the
  user is routed to support instead of being given a false promise.
- Descriptions require ≥ 10 characters; category is mandatory. Everything is
  written to `admin_audit_log`.

## The admin experience (`/admin/disputes`)

Open disputes list newest-first with the booking, both parties, amount, and
the reporter's reason. Resolution is a three-way choice:

| Resolution | Money movement | Booking ends as |
|---|---|---|
| **Refund player** | Full Paystack refund to the player's payment method | `cancelled` |
| **Release to coach** | Booking handed back to the payout cron → coach paid in full | `confirmed` → `completed` |
| **Split** | Slider: X% refunded to player, coach payout scaled to the remainder | `confirmed` → `completed` |

Internal notes are stored on the dispute; every resolution is audit-logged
with the refund/release percentages and any refund error (a failed Paystack
refund is surfaced to the admin, never swallowed).

Admins can also open disputes directly from `/admin/bookings` (Dispute button
on confirmed/completed rows) — e.g. after a support email.

## Service promise (the policy to publish)

- Every report acknowledged instantly, payout frozen instantly.
- Resolution within **48 hours** — sooner for safety concerns.
- Coach no-show, verified: **100% refund, always.**
- Refunds return to the original payment method in 2–5 business days
  (Paystack's timeline).

## Data model

`disputes`: `booking_id` (unique), `opened_by`, `reason`
(`[category] (reported by role) text`), `status` (`open`/`resolved`),
`resolution` (`refund_player`/`release_to_coach`/`split`),
`player_refund_percent`, `coach_release_percent`, `internal_notes`,
`resolved_by`, `resolved_at`.

## API surface

| Endpoint | Who | What |
|---|---|---|
| `GET /api/bookings/[id]/report` | participants | Dispute status for the booking |
| `POST /api/bookings/[id]/report` | participants | Open a report (freezes payout) |
| `GET /api/admin/disputes` | admin | List all disputes with context |
| `POST /api/admin/disputes` | admin | Open a dispute on a booking |
| `POST /api/admin/disputes/[id]/resolve` | admin | Resolve (moves money) |

## Roadmap (not yet built)

- **Auto-resolution for coach no-show**: if the coach doesn't contest within
  24h, auto-refund without admin involvement.
- Email/WhatsApp notifications to both parties at open + resolve (currently
  the status is visible in-app; resolution emails are manual).
- Strike system: repeated disputes against a coach feed the trust score and
  can auto-suspend pending review.

