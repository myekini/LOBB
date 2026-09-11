# Legal & compliance — what needs a lawyer

This is a checklist, not legal advice. It separates what engineering has
already implemented (technical safeguards) from what only a lawyer or
compliance consultant can actually close out (registrations, agreements,
policy language). Nothing in this file should be read as confirming LOBB
is compliant with anything — it's the list of open questions.

Context: LOBB collects Nigerian national ID numbers (NIN, BVN) from every
coach, moves real money between players and coaches via Paystack, and runs
analytics/tracking on all users. That's enough surface area to be worth a
real legal review before scaling past a handful of coaches.

## 1. Data protection — NDPA / NDPC

Nigeria's Data Protection Act 2023 governs this. Open questions for counsel:

- [ ] **Does LOBB need to register as a Data Controller/Processor with the
      NDPC?** Collecting NIN + BVN from every coach, and general personal
      data from every user, likely puts LOBB in scope. Registration and
      annual compliance audit filing are separate obligations if so.
- [ ] **Retention period for NIN/BVN.** Nothing in the app currently asserts
      a specific retention length (an earlier draft claimed "5 years... as
      required by law" without a citation — removed, since it wasn't
      verified). Get an actual number from counsel, then encode it as a
      real deletion/anonymization job — not just copy.
- [ ] **Lawful basis for each category of processing** — consent (current
      approach, via the checkboxes in FLOWS.md's "Checkboxes & consent"
      section) vs. contractual necessity vs. legal obligation. Consent is
      the easiest to implement but the easiest to challenge; confirm it's
      the right basis for NIN/BVN specifically.
- [ ] **Data Protection Impact Assessment (DPIA)** — likely required given
      the sensitivity of NIN/BVN at any real scale.
- [ ] **Analytics/tracking consent.** PostHog, Mixpanel, and GA4 run on all
      users today with no cookie/tracking consent banner. Confirm whether
      NDPA requires opt-in consent for this, separate from the account
      Terms/Privacy checkbox.

## 2. Vendor data processing agreements (DPAs)

Standard onboarding paperwork with each vendor that touches personal data.
Confirm each is actually signed, not just implied by using the API:

- [ ] **Paystack** — receives BVN, bank account numbers, transaction data.
- [ ] **Supabase** — hosts the database, including encrypted NIN/BVN and all
      user PII. Confirm data residency terms are acceptable.
- [ ] **Resend** — receives user emails for transactional delivery.
- [ ] **Termii** (when live) — receives phone numbers, OTP codes.
- [ ] **Smile Identity / VerifyMe** (when live) — receives NIN directly for
      NIMC verification. This is the vendor with the most direct exposure
      to raw NIN data; confirm their NIMC license covers this use case.
- [ ] **Cloudflare** (if adopted per CLOUDFLARE.md) — sits in front of all
      traffic; standard DPA, lower risk since it's transport-layer only.

## 3. NIN/BVN specifically

- [ ] **NIMC Act restrictions on NIN use/sharing.** Confirm LOBB's
      collection purpose (identity verification for a marketplace) is
      within what NIMC permits for a non-licensed party, and that routing
      it through Smile Identity/VerifyMe (who hold the actual NIMC
      integration license) is the correct model rather than LOBB needing
      its own license.
- [ ] **CBN expectations around BVN handling** for platforms that aren't
      themselves a licensed financial institution — LOBB captures BVN and
      hands it to Paystack (a licensed PSP) for validation; confirm that
      division of responsibility is correctly documented in the Paystack
      DPA and doesn't require LOBB to hold its own CBN authorization.
- [ ] Technical safeguards already in place (encryption at rest, no
      client-side exposure, consent logging) are documented in SECURITY.md
      — useful input to counsel, not a substitute for their review.

## 4. Money movement

- [ ] **Does holding player payment before it's released to the coach
      (even via Paystack's balance, not a LOBB-controlled account) create
      any money-transmission or holding-license question?** Currently no
      wallet exists — money routes directly via Paystack subaccount splits
      (see FLOWS.md § Payments) — but confirm this structure is clean.
- [ ] **The parked DVA (Dedicated Virtual Account) feature** — if ever
      activated, it moves closer to LOBB (via Paystack) holding a balance
      per coach, which is a materially different risk profile. Get this
      reviewed *before* building it, not after — see FLOWS.md's DVA note.
- [ ] **Commission structure disclosure** — the 15%/5% split is stated in
      the Coach Agreement and at checkout; confirm this satisfies any
      marketplace-fee disclosure requirements under Nigerian consumer
      protection law (FCCPC).

## 5. Consumer-facing documents

`legal/*.html` (Terms of Service, Privacy Policy, Cancellation Policy, Coach
Agreement) exist and are linked from the checkboxes described in FLOWS.md.
Confirm with counsel, not engineering:

- [ ] Governing law and dispute-resolution clause are appropriate for a
      Nigeria-only marketplace.
- [ ] Cancellation/refund terms align with FCCPC consumer-protection
      requirements (the current policy: free >24h before session, 50% fee
      inside 24h, 100% refund on coach-initiated cancellation).
- [ ] Minimum age to hold an account (especially as a coach receiving
      payouts) is stated somewhere — currently not enforced in the signup
      flow at all.
- [ ] The Coach Agreement's Code of Conduct section (now the single
      checkbox coaches accept, alongside the agreement itself — see
      FLOWS.md) still reads as a genuine, separate commitment and not
      buried filler.

## 6. What's already handled (engineering side, for reference)

Not legal review, but worth knowing before raising the above — these are
already implemented and documented in SECURITY.md / FLOWS.md:

- Per-document consent logging with IP, user agent, and document version
  (`consent_logs`, `src/lib/legal-consent.ts`).
- NIN/BVN encrypted at rest, decrypted only server-side, only where a
  third-party API call requires the raw value.
- No sensitive column is ever selected into a client-side request.
- Money amounts are always computed server-side; Paystack webhooks are
  signature-verified.

None of this closes the legal questions above — it just means the technical
foundation is in reasonable shape for whatever counsel decides is required.
