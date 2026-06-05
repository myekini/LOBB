# LOBB — Product Features Reference

Lagos tennis coach booking platform. Verified coaches, real availability, secure payment, escrow payout.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Roles](#2-roles)
3. [Booking Flow (Player)](#3-booking-flow-player)
4. [Payment & Escrow](#4-payment--escrow)
5. [Cancellation & Refund Policy](#5-cancellation--refund-policy)
6. [SMS Notifications](#6-sms-notifications)
7. [Coach Payout](#7-coach-payout)
8. [Coach Onboarding & Approval](#8-coach-onboarding--approval)
9. [Admin Tools](#9-admin-tools)
10. [Responsive UX & PWA Experience](#10-responsive-ux--pwa-experience)
11. [Infrastructure & Cron Jobs](#11-infrastructure--cron-jobs)
12. [Booking Backend — Data Model & Logic](#12-booking-backend--data-model--logic)
13. [Analytics](#13-analytics)
14. [Security, Performance & Scalability](#14-security-performance--scalability)

---

## 1. Authentication

Phone-first, passwordless. No email required.

**Flow:**
1. User enters Nigerian mobile number (+234)
2. 6-digit OTP sent via **WhatsApp** (Twilio sandbox → production number)
3. OTP verified server-side → Supabase session created
4. New users choose a role → complete profile setup
5. Returning users land on their dashboard directly

**Test accounts (dev only, gated by `LOBB_ENABLE_TEST_OTP=true`):**

| Role | Phone | OTP |
|------|-------|-----|
| Player | +2340000000001 | 000000 |
| Coach | +2340000000002 | 000000 |

**Dev quick-login (local/dev only):**
- Gated by `LOBB_ENABLE_DEV_LOGIN=true` and `NEXT_PUBLIC_LOBB_DEV_LOGIN=true`
- `/auth/login` exposes a dev panel for one-click Player, Coach, and Admin login
- Test role switching is also available from the in-app dev switcher
- Dev role accounts are seeded with profile, coach/player rows, and coach availability
- Dev-only APIs return `403` unless explicitly enabled

**Session routing after OTP verification:**

| Profile state | Destination |
|---------------|-------------|
| Coach, profile complete | `/coach/dashboard` |
| Coach, profile incomplete | `/auth/setup/coach/1` (middleware picks right step) |
| Player, profile complete | `/` (player home) |
| Player, profile incomplete | `/auth/setup/player` |
| No role yet | `/auth/role` |

---

## 2. Roles

| Role | Description | Home |
|------|-------------|------|
| `player` | Books coaching sessions | `/` |
| `coach` | Lists availability, receives bookings | `/coach/dashboard` |
| `admin` | Approves coaches, manages disputes, triggers payouts | `/admin` |

One phone number = one role. Role is set once and stored on `profiles.role`.

---

## 3. Booking Flow (Player)

Three-step wizard at `/book/[coachSlug]/step-1` → `step-2` → `step-3`.

**Browse & profile discovery:**
- Players browse coaches from `/` and `/coaches`
- Coach cards show photo, verified badge, primary skill, rating, rate, location, session/review/slot signals
- Cards include explicit actions:
  - **View profile** → `/coaches/[slug-or-id]`
  - **Book** → `/book/[coachSlug]/step-1`
- Coach profile routes and APIs resolve by either `slug` or `id`, so profile viewing still works if a slug is missing
- Desktop player navigation includes Home, Browse, Bookings, Profile

### Step 1 — Choose a slot
- Player selects a date from a 14-day window (7 days visible, toggled by week)
- Available time slots load from `coach_availability` via `/api/coaches/[slug]/slots`
- Days with open slots show a clay dot indicator
- Coach rate displayed on the coach card (`₦X/hr`)
- On "Continue": slot is **locked for 10 minutes** via `POST /api/bookings/lock`
  - Lock prevents double-booking (unique constraint on coach + slot time)
  - Returns `lock_id` + `expires_at`; countdown shown on steps 2 & 3

### Step 2 — Session details
- Player types in the court/location (required free-text field)
- Quick-select chips show the coach's preferred courts from their profile ("Courts I work with") for one-tap autofill
- Optional note to the coach (focus area, injury note, etc.)
- Countdown pill changes colour: clay → amber at 4 min → red at 2 min
- If timer hits zero → redirected back to coach profile

### Step 3 — Review & pay
- Order summary shows: coach photo, session time, location, fee breakdown
- Fee breakdown:

  | Line | Calculation |
  |------|------------|
  | Session fee | Coach's `hourly_rate_ngn` |
  | LOBB fee (5%) | `session_fee × 0.05` |
  | **Total** | `session_fee + LOBB_fee` |

- "Pay securely" calls `POST /api/bookings` → creates booking + payment record → returns Paystack hosted checkout URL
- Player is redirected to Paystack; on payment → Paystack redirects to `/book/confirm?reference=LOBB-xxx`

### Confirmation page — `/book/confirm`
- Calls `GET /api/payments/verify?reference=...` (retries up to 4× with backoff)
- Verifies payment with Paystack → updates booking to `confirmed`, payment to `paid`
- Removes slot lock
- Shows: date, coach photo, coach call/WhatsApp buttons, location, total paid, reference
- Primary CTA: **View My Bookings** (→ `/dashboard`)

### Player bookings dashboard
- Path: `/dashboard` and `/dashboard/bookings`
- Shows upcoming and past booking tabs
- Future bookings with `confirmed`, `pending`, or `pending_payment` status remain visible so checkout/verification delays do not hide a booking
- Status language:
  - `Confirmed`
  - `Confirming` when payment is paid but booking finalization is still settling
  - `Pending payment`
- Booking cards link to `/dashboard/bookings/[id]`
- Desktop layout uses a wider responsive grid; PWA/mobile keeps the bottom navigation
- Booking detail page includes coach info, contact unlock state, location, notes, payment reference, and cancellation policy

---

## 4. Payment & Escrow

**Provider:** Paystack

### Money flow — what actually happens

```
Player pays ₦21,000 on Paystack checkout (e.g. ₦20k session + ₦1k convenience fee)
        ↓
Full ₦21,000 lands in LOBB's Paystack account (no subaccount split)
        ↓
Paystack webhook fires (charge.success)
        ↓
/api/payments/webhook
  → verify HMAC-SHA512 signature
  → idempotency check (paystack_events table)
  → update payment: pending → paid
  → update booking: pending → confirmed
  → remove slot lock
  → send SMS + email to player + coach
  → schedule reminder and review jobs
        ↓
Session happens
        ↓
Cron: /api/cron/release-escrow (runs hourly, authenticated with ADMIN_SECRET)
  → Pass 1: finds confirmed bookings where ends_at + 2 hours ≤ now()
    → calls release_escrow(booking_id) Supabase RPC
    → booking status: confirmed → completed
    → escrow_released_at timestamp set
  → Pass 2: finds completed bookings with escrow_released_at set but no paystack_transfer_code
    → calls POST /transfer on Paystack for each
    → amount: coach_payout_ngn × 100 kobo
    → recipient: coach's paystack_recipient_code (RCPT_xxx)
    → stores paystack_transfer_code on booking row
        ↓
₦17,850 (85%) transferred to coach's bank account via Paystack Transfer API
₦3,150  (15%) stays in LOBB's Paystack account as platform revenue
```

### Fee breakdown

For a ₦20,000/hr coach:

| Line | Formula | Amount |
| ---- | ------- | ------ |
| Session fee | `coach.hourly_rate_ngn` | ₦20,000 |
| Convenience fee (player pays) | `session_fee × 0.05` | ₦1,000 |
| **Total charged to player** | `session_fee + convenience_fee` | **₦21,000** |
| Coach payout (transfer) | `total × 0.85` | ₦17,850 |
| LOBB revenue | `total × 0.15` | ₦3,150 |

The `platform_commission_ngn` column (`session_fee × 0.15 = ₦3,000`) is stored for internal accounting reference but **LOBB's actual Paystack receipt is ₦3,150** (15% of gross total including convenience fee).

### Escrow — true financial hold

**How it works:** All money lands in LOBB's Paystack account at payment time. The coach's 85% stays in LOBB's balance for the full 2-hour window after the session ends. The `release_escrow` cron both marks the booking `completed` and programmatically transfers the coach's share via Paystack's Transfer API. LOBB controls the timing end-to-end.

**Dispute window:** Before `release_escrow` runs (i.e. within the 2-hour post-session window), admin can call the Paystack refund API (`POST /refund`) to reverse the full transaction. Once `escrow_released_at` is set and the transfer has fired, refunds require Paystack support.

**Transfer retry:** If the Paystack transfer fails (network error, OTP required), the cron retries on its next run by querying `completed` bookings with `escrow_released_at IS NOT NULL AND paystack_transfer_code IS NULL`. The admin payout trigger can also manually retry these.

**Important Paystack account setting:** Automated transfers require "Disable OTP for transfers" to be enabled in the LOBB Paystack dashboard settings. This is an account-level toggle, not a code change.

### Transfer recipient setup

- Coach enters bank account during onboarding
- `POST /api/coaches/bank` calls `createTransferRecipient({ type: "nuban", ... })` on Paystack
- `paystack_recipient_code` (format: `RCPT_xxx`) stored on the `coaches` row
- Booking creation blocks with 403 if the coach has no recipient code (`!coach.paystack_recipient_code`)

### Verification resilience

- Webhook and `/api/payments/verify` both confirm successful transactions independently
- Webhook signature verified via HMAC-SHA512 (`PAYSTACK_WEBHOOK_SECRET`)
- `paystack_events` table provides idempotency — both paths check it before sending notifications
- Verify endpoint retries with progressive backoff (up to 12 attempts, ~60s window) to handle webhook delay
- If payment already `paid`, verify repairs booking to `confirmed` and clears slot locks

**Reference format:** `LB-{YYMM}-{XXXXX}` e.g. `LB-2606-A3F7K`

---

## 5. Cancellation & Refund Policy

**Endpoint:** `POST /api/bookings/[id]/cancel`
**Auth:** Player, coach, or admin (participant or admin only)

### Refund tiers

| Who cancels | Timing | Refund to player |
|-------------|--------|-----------------|
| Coach or admin | Any time | **100%** — always full refund (their fault) |
| Player | > 24 hrs before session | **100%** full refund |
| Player | 2 – 24 hrs before session | **50%** refund |
| Player | < 2 hrs before / no-show | **0%** — no refund |

### How refunds work
- Refund is issued via Paystack API (`POST /api/paystack/refund`)
- Full refund: Paystack refund called without amount (full transaction reversed)
- Partial (50%): Paystack refund called with `amount` in kobo (`total_paid_ngn × 0.5 × 100`)
- Payment record status updated: `paid` → `refunded` (full) or `partial_refund` (50%)
- **Timeline:** 5–7 business days back to player's debit card

### What happens on cancellation
1. Booking status → `cancelled`
2. Fields set: `cancelled_by`, `cancelled_at`, `cancellation_reason`
3. Refund initiated (per tier above)
4. WhatsApp SMS sent to both player and coach (with naira refund amount)
5. SMS job queued in `sms_jobs` table

### Player cancel UI
- **Path:** `/dashboard/bookings/[id]`
- "Cancel Booking" button visible only for `confirmed` upcoming bookings
- Cancellation policy badge shows: **Full refund** (green) / **50% refund** (amber) / **No refund** (red)
- Confirm modal shows the exact policy before confirming

### Coach cancel UI
- **Path:** `/coach/bookings/[id]`
- "Cancel This Session" button visible only for `confirmed` upcoming bookings
- Modal explicitly states: player receives a full refund
- Warning: repeated cancellations affect coach standing

---

## 6. SMS Notifications

All SMS delivered via **WhatsApp** (Twilio `twilio_whatsapp` provider).
Production fallback: Twilio regular SMS from `+17622167722`.

| Event | Recipients | Content |
|-------|-----------|---------|
| Booking confirmed | Player + Coach | Date, location, coach/player phone, reference |
| Session reminder | Player + Coach | 24 hrs before session |
| Booking cancelled | Player + Coach | Who cancelled, refund amount (₦X), reference |
| Payout processed | Coach | Amount (₦X), session count, link to earnings |
| Coach approved | Coach | Link to set availability |
| Coach rejected | Coach | Rejection reason, link to edit profile |
| Review request | Player | 2 hrs after session ends, link to review page |
| Admin digest | Admin | Daily count of pending coach profiles |

SMS jobs are queued in the `sms_jobs` table and processed by `/api/notifications/process-due` (runs daily at 3 AM WAT via Vercel cron).

---

## 7. Coach Payout

### How coach payment actually reaches the bank

LOBB holds all payments in its Paystack balance. After the 2-hour escrow window closes, the `release_escrow` cron automatically transfers `coach_payout_ngn` to the coach's registered bank account:

1. Cron marks the booking `completed` via `release_escrow()` RPC
2. Cron calls Paystack `POST /transfer` with `source: "balance"`, `amount`, and the coach's `paystack_recipient_code`
3. `paystack_transfer_code` stored on the booking row for traceability
4. Paystack settles to the coach's bank on its settlement cycle (typically T+1 business days)

### Admin payout trigger — manual recovery

`POST /api/admin/payouts/trigger` is a **recovery and manual override tool**. It handles:

- Bookings that are `completed` with `escrow_released_at` set but `paystack_transfer_code IS NULL` (auto-transfer failed)
- Admin-initiated manual payouts for a specific coach or set of bookings

**What the trigger does:**

1. Queries `completed` bookings for the coach where `paystack_transfer_code IS NULL`
2. Calls `POST /transfer` on Paystack per booking
3. Stores `paystack_transfer_code` on each booking
4. Inserts a `payouts` row: `{ coach_id, amount_ngn, session_count, booking_ids, status: "processed" | "partial" }`
5. Sends coach a WhatsApp SMS: "₦X processed for N sessions"
6. Writes to `admin_audit_log`

### Coach earnings view (`/coach/earnings`)

- Per-session breakdown with `coach_payout_ngn` per booking
- Earnings summary: net this week, net this month, net all-time
- `pending_payout_ngn` = sum of `coach_payout_ngn` for confirmed + completed bookings not yet in a processed payout record
- Bank details status and link to update via `/coach/settings`

---

## 8. Coach Onboarding & Approval

4-step setup wizard at `/auth/setup/coach/1` → `/2` → `/3` → `/4`.

| Step | What's collected |
|------|-----------------|
| 1 | Full name, profile photo, headline, primary location, service areas |
| 2 | Bio (min 50 chars), years of experience, hourly rate |
| 3 | Skill levels coached (beginner / intermediate / advanced) |
| 4 | Certifications |

After step 4 → profile submitted for admin review (status: `pending`).

**Admin review** at `/admin/coaches`:
- Approve → coach goes live, can set availability, gets WhatsApp notification
- Reject → coach notified with reason, can edit and resubmit
- 3rd rejection → coach told to contact LOBB directly
- Suspend → coach removed from listings

**Middleware guards:** incomplete coach profiles are redirected to the correct unfinished step on every request.

### Coach console

Coach workspace paths:

| Page | What it does |
|------|-------------|
| `/coach/dashboard` | Profile status, next session, earnings snapshot, recent bookings, reviews |
| `/coach/bookings` | Booking list by upcoming/completed/cancelled |
| `/coach/bookings/[id]` | Booking detail and cancellation flow |
| `/coach/availability` | Weekly windows, blocked dates, blocked individual slots |
| `/coach/earnings` | Total earnings, weekly earnings, pending payout, payout history, bank link |
| `/coach/profile` | Profile completion checklist, status banner, preview/edit/settings links |
| `/coach/profile/edit` | Editable coach profile, media, rates, bank details |
| `/coach/settings` | Phone, bank, notifications, account status, logout |

**Coach UX improvements:**
- Mobile/PWA uses bottom navigation
- Desktop uses top navigation matching the player/admin pattern
- Shared coach header supports back/home/action buttons
- Console pages use responsive grids instead of narrow phone-only columns on desktop
- Availability screen supports weekly windows plus one-off date/slot blocks
- Profile checklist helps coaches understand what is missing before review

---

## 9. Admin Tools

All at `/admin` (role: `admin` only).

| Page | What it does |
|------|-------------|
| `/admin` | LOBB operations dashboard with approvals, bookings, and revenue snapshot |
| `/admin/coaches` | Review pending coach applications, approve/reject/suspend |
| `/admin/bookings` | View booking records by status |
| `/admin/earnings` | Review platform revenue and recent paid sessions |
| `/admin/disputes` | Coming soon placeholder; dispute workflow is parked for post-MVP |

### Admin console UX

- Desktop admin shell uses a clean SaaS-style app canvas with rounded warm-grey page chrome
- Top navigation contains only core admin areas: Dashboard, Coaches, Bookings, Earnings
- Mobile/PWA admin uses a compact bottom nav for the same core areas
- Admin logout is available from the shell
- LOBB mark/brand tokens are used where useful: black command surfaces, clay primary actions, warm surfaces, quiet borders
- Dashboard copy is operational and organization-facing, not prototype language
- Removed non-actionable dashboard widgets and placeholder controls

### Admin dashboard

The `/admin` dashboard is the main LOBB headquarters view.

It includes:
- Dark **Operations Dashboard** command card with key chips:
  - Coach queue
  - Bookings
  - Platform fees
- **Priority** card showing whether coach applications need action
- Metric cards:
  - Coach Queue
  - Bookings
  - Platform Fees
  - Verified Coaches
- **Recent bookings** table with:
  - client/player avatar or initials
  - booking ID
  - session date/time
  - coach photo or initials
  - status badge
  - amount
- **Applications** right rail with pending coach photos, locations/headlines, and an Open action
- **Revenue** right rail card with:
  - gross booking value
  - platform fees earned
  - bookings created
  - link to full Earnings page

### Admin data wiring

- `/api/admin/dashboard` returns real admin metrics from `admin_core_metrics`
- Dashboard recent bookings are loaded from real `bookings`
- Dashboard booking rows join:
  - coach name, slug, and `profile_photo_url`
  - player name
  - player avatar from `profiles.avatar_url`
  - payment status/reference
- Pending coach approvals come from real `coaches` rows with `status = pending_review`
- `/admin/coaches` now uses `/api/admin/coaches/pending` directly instead of reusing the dashboard payload
- `/admin/earnings` uses `/api/admin/earnings`; it no longer reads demo/mock content
- Demo admin data has been removed from the active admin pages

### Coach approvals

Admin review at `/admin/coaches`:
- Shows pending count
- Shows coach profile photo, name, submitted date, headline, locations, rate, certifications, demo video, and public profile link
- Approve action sends the coach live
- Reject action opens a reason modal and notifies the coach
- Empty state is shown when no coaches are waiting
- Approve/reject actions use inline button loaders

### Booking management

Admin booking records at `/admin/bookings`:
- Uses real `/api/admin/bookings`
- Supports compact status filtering:
  - All
  - Pending
  - Confirmed
  - Completed
  - Cancelled
- Disputed bookings are not emphasized in the MVP admin UI
- Empty state is shown when a selected filter has no records

### Earnings

Admin earnings at `/admin/earnings`:
- Uses real `/api/admin/earnings`
- Shows LOBB earnings from completed booking commission/convenience fees
- Shows total GMV, booking count, active coaches
- Shows recent confirmed/completed revenue rows
- Each revenue row includes booking participants, date, total amount, and platform fee

### Disputes

Disputes are intentionally parked for MVP.

- `/admin/disputes` remains available so links do not break
- Page shows a concise "Coming soon" state
- Complex dispute resolution UI has been removed
- Admin dispute resolve API endpoints have been removed from the active MVP surface
- Full dispute evidence, refund split, and resolution workflow can be reintroduced later

**Admin audit log:** every approve/reject/suspend/payout action is written to `admin_audit_log` with admin ID, action, target, and metadata.

---

## 10. Responsive UX & PWA Experience

LOBB has three role-specific experiences with a shared visual language:

| Role | Mobile/PWA | Desktop web |
|------|------------|-------------|
| Player | Bottom nav, marketplace-first flow | Top nav, responsive coach grid, dashboard grid |
| Coach | Bottom nav, task-focused console | Top nav, wider dashboard/booking/availability grids |
| Admin | Bottom admin nav, compact operational cards | Top nav, app-canvas dashboard, table + right rail layout |

**Player UX details:**
- Player home has a time-aware premium greeting card:
  - Morning → sunrise icon
  - Afternoon → sun icon
  - Evening → moon icon
- Greeting card uses useful marketplace signals, not random tennis imagery:
  - coaches with open slots
  - verified coach count
  - top active area
  - direct "View My Bookings" CTA
- Avatar opens an account dropdown instead of forcing navigation:
  - My bookings
  - Browse coaches
  - Profile settings
  - Sign out

**Responsive alignment standards:**
- Booking step headers use aligned back button + centered title layout
- Booking flow content expands on desktop (`max-w-3xl`) while staying compact on mobile
- Player, coach, and admin dashboards use wider desktop grids
- Cards avoid nested-card clutter and prioritize primary actions

### Loading states

LOBB uses an enterprise loading pattern:

| Loading type | Used for | Examples |
|--------------|----------|----------|
| Skeletons | Page/data loading where layout is known | dashboards, booking lists, coach cards, admin tables |
| Inline action loaders | User-triggered actions | save profile, save availability, approve/reject coach, payment redirect |
| LOBB brand loader | Secure bridge states only | PWA cold start, payment verification, auth/session transitions |
| Lazy loading | Heavy secondary content | reviews, media/video embeds, future dispute module, long-history sections |

Implemented shared loading primitives:
- `SkeletonBlock`
- `PageHeaderSkeleton`
- `MetricGridSkeleton`
- `TableRowsSkeleton`
- `BookingCardSkeleton`
- `CoachCardSkeleton`
- `InlineActionLoader`
- `LobbBrandLoader`

Rules:
- Do not use full-screen spinners for dashboard data
- Do not use the LOBB brand loader for ordinary table/list fetches
- Keep button loading local to the clicked action
- Preserve layout during loading to avoid content jumps
- Use branded loader only when LOBB is moving the user through a secure or system-level state

---

## 11. Infrastructure & Cron Jobs

**Stack:** Next.js 14 (App Router) · Supabase (Postgres + Auth + Storage) · Paystack · Twilio WhatsApp · Vercel

**Cron jobs** (configured in `vercel.json`, authenticated with `ADMIN_SECRET`):

| Job | Schedule (UTC) | What it does |
|-----|---------------|-------------|
| `/api/cron/release-escrow` | 2 AM daily | Marks bookings `completed` 2 hrs after session ends, sets `escrow_released_at` |
| `/api/cron/admin-digest` | 9 AM daily | Sends admin WhatsApp with count of pending coach profiles |
| `/api/notifications/process-due` | 3 AM daily | Sends queued SMS jobs from `sms_jobs` table |
| `/api/notifications/schedule-booking-jobs` | 6 AM daily | Creates reminder jobs for upcoming sessions |

**Key env vars:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase key (server only) |
| `PAYSTACK_SECRET_KEY` | Paystack API (server only) |
| `PAYSTACK_PUBLIC_KEY` | Paystack API (client) |
| `PAYSTACK_WEBHOOK_SECRET` | HMAC signature verification for webhooks |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `TWILIO_FROM_NUMBER` | Trial SMS number (+17622167722) |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sandbox (+14155238886) |
| `LOBB_ENABLE_TEST_OTP` | `true` in dev — skips real SMS for test phones |
| `ADMIN_SECRET` | Protects cron endpoints + admin API |

---

## 12. Booking Backend — Data Model & Logic

### Core tables

| Table | Purpose |
|-------|---------|
| `coach_availability` | Weekly recurring windows per coach (`day_of_week`, `starts_at`, `ends_at`, `is_active`) |
| `coach_availability_blocks` | Full-day blackouts (`blocked_date`) |
| `coach_availability_slot_blocks` | Granular 60-min slot blocks within an otherwise-open window |
| `slot_locks` | 10-minute exclusive hold placed on a slot when a player starts checkout |
| `bookings` | One row per session; tracks status lifecycle from `pending` → `confirmed` → `completed` |
| `payments` | Paystack transaction record linked 1-to-1 with a booking |
| `paystack_events` | Webhook idempotency log keyed on Paystack reference |

### Coach availability setup

**API:** `GET / PUT /api/coaches/me/availability`

A coach's bookable schedule is composed of three layers:

1. **Weekly windows** — recurring time ranges per day-of-week (e.g. Monday 09:00–17:00). Multiple non-overlapping windows per day are supported. The PUT endpoint does a full replace (delete-all then insert), so the client always sends the complete desired state.
2. **Full-day blocks** — date strings (`YYYY-MM-DD`) that close an entire day regardless of weekly windows.
3. **Slot-level blocks** — ISO timestamp pairs that block an individual 60-min slot within an open window (used to close a specific hour without touching the rest of the day).

Validation on PUT:
- `starts_at < ends_at` for every window
- No two windows on the same day may overlap
- Blocked dates must be `YYYY-MM-DD`
- Slot block timestamps must parse to valid ISO dates with start < end

### Slot generation — `get_coach_available_slots()`

Supabase RPC function called at `GET /api/coaches/[slug]/slots`. Returns the next 14 days of bookable 60-min slots.

Logic (in order):
1. Enumerate every date from `from_date` to `to_date`.
2. For each date, join with `coach_availability` where `day_of_week` matches and `is_active = true`.
3. Within each matching window, generate one slot per hour (e.g. 09:00, 10:00 … for a 09:00–17:00 window).
4. Discard slots that start before `now() + 24 hours` (minimum advance notice).
5. Discard slots on dates present in `coach_availability_blocks`.
6. Discard slots whose time range overlaps any row in `coach_availability_slot_blocks`.
7. Discard slots that conflict with existing confirmed bookings (±15 min buffer).
8. Return deduplicated results ordered by `slot_starts_at`.

### Slot lock (`POST /api/bookings/lock`)

Called when the player taps "Continue" at the end of Step 1.

- Validates the slot is 24 h–14 days in the future and appears in `get_coach_available_slots`.
- Inserts a row into `slot_locks` with a `UNIQUE(coach_id, slot_starts_at)` constraint — if another player is already in checkout, the insert fails with 409.
- Lock expires after 10 minutes (`expires_at = now() + interval '10 minutes'`).
- Returns `{ lock_id, expires_at }`. The countdown timer on Steps 2 and 3 is driven by `expires_at`.

### Booking creation (`POST /api/bookings`)

Called on Step 3 when the player taps "Pay securely".

Validations:
- Player has a completed `players` row.
- `lock_id` exists, belongs to this player, is not yet used (`booking_id IS NULL`), is not expired, and its `slot_starts_at` matches the requested slot.
- Coach exists and has `status = 'active'`.
- Lock's `coach_id` matches the coach resolved from `coach_slug`.

Fee calculation (authoritative server-side):

```
session_fee         = coach.hourly_rate_ngn
platform_commission = round(session_fee × 0.15)     // stored for internal accounting
convenience_fee     = round(session_fee × 0.05)     // charged on top to player
total_amount        = session_fee + convenience_fee  // gross charged to player
coach_payout        = round(total_amount × 0.85)    // transferred to coach after escrow window
// LOBB receives: total_amount × 0.15 (= platform_commission + 85% of convenience_fee)
```

Sequence:

1. Initialise Paystack transaction (`email`, `amount_kobo = total_amount × 100`) — no subaccount split; full amount goes to LOBB.
2. Insert `bookings` row with `status = 'pending'`.
3. Insert `payments` row with `status = 'pending'`.
4. Mark lock as used: `UPDATE slot_locks SET booking_id = [new_id]`.
5. Return `{ booking_id, reference, paystack_url }` → client redirects player to Paystack hosted checkout.

### Payment confirmation (dual-path)

Both paths are idempotent and can run independently:

**Path A — Paystack webhook** (`POST /api/payments/webhook`):
- Verifies `x-paystack-signature` (HMAC-SHA512 with `PAYSTACK_WEBHOOK_SECRET`).
- Upserts into `paystack_events`; skips if already processed.
- On `charge.success`: sets payment `status = 'paid'`, booking `status = 'confirmed'`, deletes slot lock, queues notification jobs.

**Path B — Verify endpoint** (`GET /api/payments/verify?reference=...`):
- Called by the confirmation page with exponential backoff (4 attempts, ~1.4 s–5.6 s).
- If payment is already `paid`, repairs booking to `confirmed` and clears locks.
- Otherwise calls Paystack API directly to verify; applies the same state transitions as the webhook.

### Coach booking management

**API:** `GET /api/bookings` (role-aware — coaches receive their own bookings ordered by `starts_at ASC`)

**Coach bookings page** (`/coach/bookings`): tabs for Upcoming (`confirmed`), Completed, and Cancelled. Stats show upcoming count, completed session count, and total earned.

**Coach booking detail** (`/coach/bookings/[id]`):
- Full session info: date, duration, location, court label (National Stadium), payout breakdown.
- Player name and **direct contact buttons** (Call + WhatsApp) populated from `profiles.phone_number` via a secondary lookup in `/api/bookings/[id]`.
- "Cancel Session" button (visible only for confirmed future sessions) triggers a full refund to the player.

### Player booking dashboard

**API:** `GET /api/dashboard/player` (cached client-side via `fetchWithCache`)

- Returns `upcoming` and `past` booking arrays.
- Upcoming includes `pending`, `pending_payment`, and `confirmed` statuses so that bookings are visible even before the Paystack webhook has settled.
- Status labels: `Confirmed` (green), `Confirming` (clock — paid but webhook slow), `Pending payment` (amber warning).

### Status lifecycle

```
pending
  └── payment confirmed (webhook or verify)
        └── confirmed
              ├── session occurs
              │     └── [cron: release-escrow] → completed
              ├── cancelled_by_player / cancelled_by_coach / cancelled (admin)
              └── disputed → resolved by admin → completed or refunded
```

### Cancellation & refund tiers (summary)

| Who | When | Refund |
|-----|------|--------|
| Coach or admin | Any time | 100% |
| Player | > 24 h before | 100% |
| Player | 2–24 h before | 50% |
| Player | < 2 h before | 0% |

Refund is issued via Paystack API; payment record updated to `refunded` or `partial_refund`.

---

## 13. Analytics

Two tools run in parallel. Both receive the same key events via `src/lib/analytics.ts` (`track()`).

### Tool roles

| Tool | Purpose | Primary user |
|------|---------|-------------|
| **PostHog** | Behavioral product intelligence — session recordings, heatmaps, funnel analysis, feature flags | Dev / product |
| **Mixpanel** | Business metrics dashboard — GMV, conversion rates, cohort retention, north star tracking | Founder / business |

### Setup

| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Vercel + `.env.local` | Required — PostHog is silent in production until this is set |
| `NEXT_PUBLIC_POSTHOG_HOST` | Vercel + `.env.local` | Defaults to `https://us.i.posthog.com` |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Vercel ✅ set | Token in Vercel production env |
| `NEXT_PUBLIC_MIXPANEL_ENABLED` | Vercel ✅ set | `true` in production |

PostHog is opted-out in development (`client.opt_out_capturing()` in `posthog-provider.tsx`).
Mixpanel debug mode is on in development, off in production.

### Events tracked

All events fire to **both** tools via `track(event, properties)` in `src/lib/analytics.ts`.

#### Auth & onboarding funnel

| Event | Fired in | Key properties |
|-------|---------|---------------|
| `User Signed In` | `auth/verify/page.tsx` | `role` |
| `Role Selected` | `auth/role/page.tsx` | `role` |
| `Coach Onboarding Step Completed` | `auth/setup/coach/[1-3]/page.tsx` | `step` (1, 2, or 3) |
| `Coach Profile Submitted` | `auth/setup/coach/4/page.tsx` | — |
| `Player Profile Created` | `auth/setup/player/page.tsx` | — |

#### Booking funnel (north star)

| Event | Fired in | Key properties |
|-------|---------|---------------|
| `Booking Started` | `book/[coachSlug]/step-1/page.tsx` | `coach_slug`, `coach_name`, `coach_rate`, `slot_iso` |
| `Payment Initiated` | `book/[coachSlug]/step-3/page.tsx` | `coach_slug`, `session_fee`, `lobb_fee`, `total`, `booking_id`, `reference` |
| `Booking Confirmed` | `book/confirm/page.tsx` | `booking_id`, `coach_slug`, `coach_name`, `total_paid`, `reference` |

#### Automatic (no custom code needed)

| What | Tool | How |
|------|------|-----|
| Page views | Both | PostHog: `$pageview` in `posthog-provider.tsx`; Mixpanel: `Page Viewed` in `mixpanel-provider.tsx` |
| Page leaves | PostHog | `capture_pageleave: true` |
| Clicks, inputs, form submits | Both | `autocapture: true` on both providers |
| Session recordings | PostHog | `record_sessions_percent: 100` in Mixpanel (session replay) |
| User identity | Both | Set on auth state change in respective providers |

### Mixpanel dashboard — what to build

Build these boards in Mixpanel once events are flowing:

**1. North Star — Bookings**
- Metric: `Booking Confirmed` count over time (daily/weekly)
- Secondary: total `total_paid` sum = GMV

**2. Booking Funnel**
- Steps: `Booking Started` → `Payment Initiated` → `Booking Confirmed`
- Shows where players drop off and the conversion rate end-to-end

**3. User Acquisition**
- `User Signed In` by `role` over time
- New vs returning (Mixpanel first-touch vs repeat)

**4. Coach Supply Funnel**
- `Role Selected` (role=coach) → `Coach Profile Submitted` → (coach approved, tracked server-side)
- Shows supply pipeline health

**5. Player Activation**
- `Player Profile Created` → `Booking Started` → `Booking Confirmed`
- Cohort: % of new players who complete first booking within 7 days

### PostHog — recommended setup

1. **Funnel insight**: `Booking Started` → `Payment Initiated` → `Booking Confirmed` — watch for drop-off at payment
2. **Session recordings**: filter by users who hit `Booking Started` but not `Booking Confirmed` to watch where they left
3. **User properties**: `role` is set on identify — use it to create player and coach cohorts
4. **Feature flags**: wire future experiments (e.g. new booking UI) through PostHog flags

---

## 14. Security, Performance & Scalability

### Shipped (June 2026)

#### Authentication hardening

| Fix | File | Detail |
|-----|------|--------|
| `AUTH_SESSION_SECRET` is required | `api/auth/verify-otp/route.ts` | Throws on startup if missing — no silent fallback to a hardcoded string |
| OTP deletion is awaited | `lib/db-otp.ts` + `verify-otp/route.ts` | `consumeOtp` now fully awaits the DB delete; closes same-OTP-twice race window |
| Payment callback URL hardened | `api/bookings/route.ts` | `callbackOrigin()` reads from `NEXT_PUBLIC_APP_URL` only; `x-forwarded-host` no longer trusted for Paystack redirect |

#### Rate limiting

Applied at the IP level on all high-value write endpoints. Implemented as a sliding-window in-memory counter (`src/lib/rate-limit.ts`).

| Route | Limit | Window |
| ----- | ----- | ------ |
| `POST /api/auth/verify-otp` | 5 attempts | 15 min |
| `POST /api/bookings/lock` | 10 locks | 5 min |
| `POST /api/bookings` | 5 bookings | 10 min |
| `GET /api/payments/verify` | 30 calls | 5 min |

Blocked requests return `429` with a `Retry-After` header.

> **Scale note:** The current limiter is per warm Vercel instance (in-memory `Map`). For multi-instance enforcement, replace `src/lib/rate-limit.ts` with `@upstash/ratelimit` + a Redis KV store — the call signature is identical.

#### Webhook performance

`POST /api/payments/webhook` and `GET /api/payments/verify` both use `waitUntil` (from `@vercel/functions`) to dispatch SMS and email notifications **after** the HTTP response is sent.

- Paystack receives its `200` as soon as the booking is confirmed in the database
- Players on the confirm page see the confirmed booking as soon as the DB is written, not after email/SMS delivery
- Notification failures cannot cause webhook retries

#### JWT role claims (middleware DB call eliminated)

A Supabase custom access token hook (`public.custom_access_token_hook`) embeds `profiles.role` into every JWT as `app_metadata.role`.

The middleware reads the role from the JWT — zero extra DB round-trips on authenticated page loads. Sessions that predate the hook fall back to a DB query automatically.

**One-time action required:** In the Supabase dashboard → **Authentication → Hooks → Custom Access Token Hook**, select `public.custom_access_token_hook`. The SQL function was deployed in migration `20260605000001`.

#### Stuck payout visibility

- `bookings.transfer_last_error` column stores the Paystack error message when a cron transfer fails
- Admin dashboard (`/admin`) shows an amber alert card when any `completed` booking has `escrow_released_at IS NOT NULL` and `paystack_transfer_code IS NULL`
- Admin can navigate to Earnings and use the manual payout trigger per coach to retry

#### Database indexes

Applied in migration `20260605000002`. Cover the hot query paths identified by `EXPLAIN ANALYZE`:

| Index | Table | Query it covers |
| ----- | ----- | --------------- |
| `bookings_escrow_release_idx` | `bookings` | Escrow cron: `status='confirmed' AND ends_at<=? AND escrow_released_at IS NULL` |
| `bookings_pending_transfer_idx` | `bookings` | Transfer retry: `status='completed' AND paystack_transfer_code IS NULL` |
| `slot_locks_coach_slot_idx` | `slot_locks` | Slot availability: `coach_id=? AND slot_starts_at=? AND expires_at>now()` |
| `coach_availability_coach_active_idx` | `coach_availability` | Slot generation: `coach_id=? AND is_active=true` |
| `coach_availability_blocks_coach_date_idx` | `coach_availability_blocks` | Date block lookup: `coach_id=? AND blocked_date=?` |
| `coach_slot_blocks_coach_range_idx` | `coach_availability_slot_blocks` | Slot overlap check: `coach_id=? AND range` |
| `profiles_email_idx` | `profiles` | OTP + admin lookup by email |

---

### Remaining / Backlog

These items were identified in the June 2026 audit but not yet implemented. Ordered by priority.

#### High

| Item | Where | Detail |
| ---- | ----- | ------ |
| Supabase error messages reach the client | Multiple API routes | `error.message` from Supabase (which includes table/column names) is returned directly in JSON. Should be logged server-side and replaced with a generic message. |
| `listUsers({ perPage: 1000 })` ceiling | `api/admin/setup/route.ts:51`, `api/auth/verify-otp/route.ts:130` | Full auth-user table scan. Fails silently beyond 1 000 users. Fix: query `profiles` by email directly instead of scanning `auth.users`. |
| No default API protection | Pattern (all routes) | Every route must call `requireRole()` manually. A missed route is fully open. Consider a typed `withRole(handler, "player")` wrapper that enforces auth and removes the manual pattern. |

#### Medium

| Item | Detail |
| ---- | ------ |
| No Zod request validation | Body parsing is manual (cast + destructure). Replace with `z.parse()` at route entry for all POST/PUT bodies. |
| Admin setup endpoint public | `/api/admin/setup` is reachable by anyone who knows `ADMIN_SETUP_SECRET`. Add Vercel firewall IP allowlist or convert to a local-only script. |
| Player notes max length | `player_notes` is trimmed but has no server-side max. Add `.slice(0, 1000)` or a Zod `max(1000)` constraint. |

#### Low / Scalability

| Item | Detail |
| ---- | ------ |
| In-memory rate limiter | Current limiter is per Vercel instance. Upgrade to `@upstash/ratelimit` + Redis KV for cross-instance enforcement at scale. |
| No HTTP caching on public routes | `GET /api/coaches` and `GET /api/coaches/[slug]` return fresh DB queries on every hit. Add `Cache-Control: s-maxage=60, stale-while-revalidate=300` headers. |
| Admin booking list pagination | `/api/admin/bookings` has a hard `LIMIT 100`. Add cursor-based pagination with `?page=` and `?limit=` params. |
| No audit logging for financial ops | Payment confirmation, escrow release, and transfers are not written to `admin_audit_log`. Add entries for traceability and compliance. |
