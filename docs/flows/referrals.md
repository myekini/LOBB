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
