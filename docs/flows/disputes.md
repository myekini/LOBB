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
