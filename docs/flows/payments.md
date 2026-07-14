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
