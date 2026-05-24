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
- Player enters court/location (required) and a note to the coach (optional)
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

**Flow:**

```
Player pays on Paystack checkout
        ↓
Paystack webhook fires (charge.success)
        ↓
/api/payments/webhook
  → verify HMAC-SHA512 signature
  → idempotency check (paystack_events table)
  → update payment: pending → paid
  → update booking: pending → confirmed
  → remove slot lock
  → send SMS to player + coach
  → schedule reminder jobs
        ↓
Session happens
        ↓
Cron: release-escrow runs 2 hrs after session ends
  → calls release_escrow(booking_id) Supabase RPC
  → booking status: confirmed → completed
  → escrow_released_at timestamp set
        ↓
Admin triggers payout to coach bank account
```

**Verification resilience:**
- Webhook and `/api/payments/verify` both confirm successful transactions
- Webhook signature verification uses Paystack HMAC-SHA512
- Verification accepts both `pending` and `pending_payment` bookings
- If payment is already `paid`, verification repairs booking status to `confirmed` and clears related slot locks
- `paystack_events` prevents duplicate webhook/SMS processing

**Subaccount split (when coach has a Paystack subaccount):**
- LOBB charges 15% commission (`platform_commission = session_fee × 0.15`)
- Coach receives 85% (`coach_payout = session_fee × 0.85`)
- 5% convenience fee is charged on top (player pays it, LOBB keeps it)

**Reference format:** `LOBB-{timestamp-base36}-{random}` e.g. `LOBB-LQK7F2-3XY8Z`

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

Payouts are currently **manual** (admin-triggered). Wallet system is a future phase.

**Payout flow:**
1. Session completes → escrow released (2 hrs after `ends_at`)
2. Admin reviews coach's completed bookings at `/admin/earnings`
3. Admin triggers `POST /api/admin/payouts/trigger` with `{ coach_id, booking_ids? }`
4. System calculates total: `SUM(coach_payout_ngn)` for selected completed bookings
5. Payout record created in `payouts` table (status: `processed`)
6. Coach gets WhatsApp SMS: "₦X sent to your bank for N sessions"
7. Admin audit log entry created

**Coach sees** their earnings breakdown at `/coach/earnings`:
- Per-session breakdown
- Total earned, total pending payout

**Future: LOBB credit wallet**
Refunds → LOBB credits (instant, no 5–7 day delay). Credits applied at checkout. Avoids CBN e-money licence risk at current scale. Not built yet.

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
