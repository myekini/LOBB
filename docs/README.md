# LOBB Documentation

LOBB is a Nigerian tennis-coach booking marketplace: players find verified
coaches, book and pay online; LOBB holds the money until the session happens,
then pays the coach. Next.js 14 (App Router) + Supabase (Postgres/Auth/RLS) +
Paystack (charge/transfer/refund) + Resend (email), deployed on Vercel.

## How these docs are organised

| Doc | What it covers |
|---|---|
| [flows/authentication.md](flows/authentication.md) | Email OTP auth, signup vs login, role routing, session handling |
| [flows/booking.md](flows/booking.md) | Slot discovery, slot locks, the 3-step booking flow, cancellation |
| [flows/payments.md](flows/payments.md) | Charge → escrow → release → coach transfer; refunds; webhook; money fields |
| [flows/disputes.md](flows/disputes.md) | Player-facing issue reporting, freeze, admin resolution, trust policy |
| [flows/referrals.md](flows/referrals.md) | Coach referral links, attribution, credits, batched payouts |
| [flows/kyc-and-payouts.md](flows/kyc-and-payouts.md) | Coach identity (NIN/BVN), bank verification, recipient codes, DVA roadmap |
| [availability-and-booking.md](availability-and-booking.md) | Deep dive: weekly windows, blocked dates, slot generation SQL |
| [OPERATIONS.md](OPERATIONS.md) | Environments, staging strategy, deploy runbook, crons, monitoring |
| [SECURITY.md](SECURITY.md) | Implemented security measures and known gaps |
| [PRODUCT.md](PRODUCT.md) | Product vision and scope |
| [FEATURES.md](FEATURES.md) | Feature inventory (historical spec) |
| [DESIGN.md](DESIGN.md) | Design system: tokens, components, layout rules |
| [LOBB_KYC_Payments_Referral_Brand.md](LOBB_KYC_Payments_Referral_Brand.md) | Strategy memo (May 2026): KYC depth, DVA research, referral spec, brand |

**Rule of thumb:** `flows/` documents *how the code works today* — keep these
in sync with the implementation. The strategy memo and FEATURES.md describe
*intent* and may be ahead of or behind the code.

## The system at a glance

```
Player                    LOBB (Next.js + Supabase)                 Coach
  │  email OTP signup  ──▶  auth + profiles/players rows
  │  browse /coaches   ──▶  coach_profiles_public view
  │  pick slot         ──▶  slot_locks (10-min hold)
  │  pay (Paystack)    ──▶  bookings + payments (status: paid)
  │                          money sits in LOBB's Paystack balance
  │        session happens
  │                          cron: release-escrow (nightly)
  │                          booking → completed, escrow released
  │                          Paystack Transfer ──────────────▶  coach's bank
  │  report issue      ──▶  dispute freezes payout until resolved
```
