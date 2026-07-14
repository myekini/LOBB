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
