# LOBB — Coach KYC, Payment Architecture (DVA), & Referral System
## Three Things You Asked About, Answered Properly

> Version 1.0 | May 2026
> This document covers: coach verification depth, Paystack DVA research + recommendation, and the referral system spec.
> Brand critique appended at the end — also added to LOBB_GTM_Strategy.md.

---

# PART 1 — COACH KYC: BEYOND MANUAL APPROVAL

### Why Manual Approval Alone Is Not Enough

Manual admin approval catches *profile quality* — bad photos, weak bios, vague credentials. It does not catch *identity fraud* — someone claiming to be a coach who isn't, someone using another coach's certification, someone who shouldn't have access to a bank payout account. Those are different problems requiring different checks.

LOBB is a payments product, not just a directory. The moment money moves through LOBB to a coach's bank account, you inherit a basic KYC obligation — both for fraud protection and because Paystack itself will not let you move money to an unverified account without certain checks already in place.

### The Three Layers of Coach Verification

**Layer 1 — Identity verification (who is this person, really)**

This is the layer manual approval does not cover. The minimum viable version:

- **NIN (National Identification Number)** — collected at profile setup. This is now the standard Nigerian identity layer; CBN's tiered KYC framework treats NIN as a baseline requirement for any platform moving money to an individual.
- **BVN (Bank Verification Number)** — required anyway by Paystack to create a verified payout destination (see Part 2). BVN is tied to the coach's bank account and cross-checks their legal name against bank records.
- **Name match check** — the name on the NIN/BVN must match the name on the coach's LOBB profile and the name on their bank account. If "Ibrahim Salaudeen" is the profile name but the BVN returns "Ibrahim Olamide Bello," that is a hard stop, not a soft warning.

This is not optional infrastructure — it is the same identity layer every serious Nigerian fintech (Paystack itself, PiggyVest, Cowrywise) uses, and it is now explicitly expected for anyone moving money to individuals, even informally.

**Layer 2 — Credential verification (is this person actually a coach)**

This is softer — no government database to check against — but it is what makes "LOBB Verified" mean something:

- Coach uploads a photo of their certification document (ITF, PTCAN membership card, NTF certificate, or equivalent)
- Admin visually checks the document is legible and the name matches the profile
- For coaches with no formal certification but real experience: require 2 reference contacts (phone numbers of current/former students or a club they coach at) that admin can call to verify
- The demo video requirement (already in MVP spec) doubles as a soft credential check — admin can visually assess whether someone coaching on camera looks legitimate

**Layer 3 — Ongoing trust signals (does this person stay trustworthy)**

Verification is not a one-time event. Build this in from day one even if it is lightweight:

- Strike system already in the MVP spec (no-shows, cancellations) feeds into an ongoing trust score
- Players can flag a coach profile ("This doesn't look like the person who showed up") — routes directly to admin review
- Re-verification trigger: if a coach changes their bank account or phone number, re-run BVN/NIN match before allowing payouts to resume

### What This Looks Like in the Onboarding Flow

```
COACH ONBOARDING — REVISED FLOW

Step 1: Phone OTP signup (existing)
Step 2: Profile basics — name, photo, headline, bio (existing)
Step 3: NEW — Identity verification
         - Enter NIN
         - Enter BVN
         - System cross-checks NIN/BVN names match each other
Step 4: Credentials — upload certification photo OR provide 2 reference contacts (existing, made firmer)
Step 5: Demo video upload (existing)
Step 6: Bank account — connect via Paystack
         - System cross-checks bank account name matches BVN name
         - If mismatch: hard stop, coach must resolve before continuing
Step 7: Profile submitted for admin review (existing)
Step 8: Admin reviews profile content (photo, bio, video) — same as before
         AND confirms identity layer passed automatically (no manual BVN review needed —
         system already validated this in Step 3 and 6)
Step 9: Approved → LOBB Verified badge → live
```

### Why This Order Matters

Identity verification happens **before** admin spends time reviewing profile content. If a coach's NIN/BVN doesn't match or fails verification, you never waste admin time reviewing their bio and video. The system rejects bad identity automatically; the human only reviews profile quality for people who already passed the identity check. This is both faster for you and a stronger trust foundation than manual approval alone.

### What This Costs

NIN and BVN verification via a provider like Paystack's own customer validation (bundled into the DVA flow — see Part 2), Smile Identity, or VerifyMe runs roughly ₦50–150 per verification call in Nigeria as of 2026. At 20 coaches in Month 1, that is ₦1,000–₦3,000 total. Cheap insurance against a fraud incident that would otherwise destroy trust in the entire platform.

---

# PART 2 — PAYSTACK RESEARCH: DVA, WHAT THEY OFFER, WHERE THEY FALL SHORT, AND THE VIRTUAL ACCOUNT QUESTION

### What a Dedicated Virtual Account (DVA) Actually Is

A DVA is a real, individually-numbered Nigerian bank account that Paystack generates and assigns to a specific customer (in your case, each coach). It allows businesses to create and reserve bank account numbers to receive customer payments, so customers can pay via bank transfer to that dedicated account anytime. It's built on the Paystack-Titan partnership, where Paystack integrates directly with the Nigerian Interbank Settlement System for real-time transaction visibility.

Every DVA is tied to a customer record — created by passing the customer's email, first name, last name, and phone to Paystack's Create Customer API, then validating that customer (BVN required for Nigerian businesses), then assigning the dedicated account. This can be done in a single API call or as multi-step flow where you control each stage.

**This is exactly the Shuttlers-style wallet experience you're describing.** When a Shuttlers user funds their wallet, they're sending money to a DVA — a real account number with their name on it, generated and managed by the payment processor (Paystack, in Shuttlers' case, or similar). It feels clean because it *is* a real bank account, not an abstraction.

### How DVA Would Work for LOBB Coaches

```
COACH DVA FLOW

1. Coach completes identity verification (NIN/BVN — Part 1, Step 3)
2. LOBB creates a Paystack Customer record for the coach
   (email, first_name, last_name, phone — all required)
3. LOBB validates the customer via BVN
   (required for NIN/BVN-linked DVA issuance per CBN rules)
4. Paystack issues a DVA: a real bank account number, in the coach's name,
   hosted at Titan Trust Bank (or Wema/Access/Zenith, depending on availability)
5. This DVA appears in the coach's LOBB earnings dashboard as:
   "Your LOBB Account: 9123456789 (Titan Trust Bank)"
6. When LOBB releases a coach's payout (after session completion, per existing
   escrow logic), the transfer goes to this DVA — not directly to the coach's
   personal bank account
7. The coach sees their balance accumulate in their "LOBB wallet" (which is really
   their DVA balance)
8. Coach can withdraw from their DVA to their personal bank account whenever they want
   — OR leave it there and let it accumulate
```

### Why This Is Cleaner Than the Current "LOBB Holds Funds" Model

This is the structural fix to the exact discomfort you described. Right now, the language is "LOBB holds the coach's payout until after the session" — which is accurate, but creates the impression that LOBB itself is sitting on a pile of undifferentiated cash that belongs to various coaches, with internal LOBB bookkeeping as the only thing tracking whose money is whose. That is uncomfortable to operate and uncomfortable to explain.

With DVAs:
- Each coach has their **own named, real bank account number** from day one
- Money routes to *that specific account*, not into one shared LOBB pool
- The coach can see real bank-grade transaction history on their own account
- LOBB is not "holding" anything in an ambiguous sense — money sits in the coach's own dedicated account once released
- It mirrors exactly the Shuttlers/PiggyVest/Cowrywise pattern you already trust as a user

This doesn't eliminate the pre-session escrow period (money still needs to sit somewhere *before* the session completes, while it's "at risk"). But it cleans up what happens **after** release — instead of an opaque internal ledger entry, the coach has a real account with their name on it.

### The Two-Stage Money Flow With DVA

```
STAGE 1 — Pre-session (escrow period, unchanged)
Player pays ₦21,000 → Lands in LOBB's MAIN Paystack account
(this part is unavoidable — money has to sit somewhere while the
session hasn't happened yet and could still be refunded)

STAGE 2 — Post-session (payout, NOW CLEANER)
2 hours after session start → LOBB transfers ₦17,000 → Coach's DVA
(not to a vague "coach earnings balance" — to a real, named bank account
specific to that coach, hosted by Paystack-Titan)

Coach sees: "₦17,000 received in your LOBB Account — 9123456789"
Coach can: withdraw to personal bank anytime, or let it sit
```

This does not change your core escrow/payout timing logic from the earlier documents. It changes **where the money lands** once it's released — from an abstract internal balance to a real account number. The "LOBB holds your payout" language for the *pre-session* period stays exactly as drafted in the audit fix document (legally accurate, no escrow claim). What changes is that post-release, you can now honestly say: *"Your payout goes straight into your own LOBB account — a real bank account in your name."*

### What Paystack Offers (Confirmed)

- DVA creation via Dashboard or API, currently available to Nigeria-based registered businesses
- Ghana was added as a supported country for DVA in a recent update, alongside Cote d'Ivoire mobile money channels — relevant for your Accra expansion later
- Inbound Transfer Approvals — Nigerian merchants can now approve or reject inbound transfers to Paystack-Titan virtual accounts, covering both Pay with Transfer and DVA transactions — useful fraud control layer
- A Requery endpoint lets merchants check a virtual account for unprocessed transactions and triggers a background requery with webhook notification if pending transactions are found — useful for reconciliation if a webhook is ever missed
- Partner banks for DVA issuance: Wema Bank, Access Bank, Zenith Bank, and Titan Trust Bank (a CBN-licensed commercial bank)

### Pricing

Paystack's dedicated virtual accounts charge a 1% transaction fee, capped at ₦300 per transaction. This is separate from and in addition to standard Paystack transaction fees on the player-side checkout. For a coach payout of ₦17,000 landing in their DVA, the fee would be capped at ₦300 — negligible relative to the payout size.

### Requirements to Set This Up

There are three main requirements for creating a DVA for a customer, and businesses in financial services, betting, or general services categories must additionally validate their customers — which for those categories can only be done via the API, not the dashboard, because customer validation is mandatory for those business types. LOBB likely falls under "general services" as a marketplace, which means: **DVA issuance for coaches must go through the API with customer validation (BVN) built in — not a manual dashboard click per coach.** This aligns exactly with the KYC flow in Part 1 — BVN collection becomes a dual-purpose step (identity verification AND DVA eligibility).

This feature is only available to registered businesses in Nigeria and Ghana that have completed Paystack's go-live process — confirm LOBB's Paystack account is fully live (not test mode) before building this.

### Where Paystack Falls Short (Be Honest About This)

- **DVA is Nigeria/Ghana only** — when LOBB expands to Kenya (M-Pesa territory), this entire payout model needs a parallel implementation. Plan for that, don't be surprised by it.
- **DVA does not eliminate the pre-session escrow question** — it only cleans up the post-release destination. You still need to explain clearly what happens to money *before* a session happens (see the approved language from the audit fix document — keep using it).
- **Bank partner dependency** — DVAs are hosted at Titan Trust, Wema, Access, or Zenith. If Paystack changes bank partners or a partner bank has downtime, coach payouts could be delayed. Build the production monitoring (already specified in the audit fix document) to catch this.
- **Per-coach onboarding friction** — each coach now needs BVN collection and validation before they can be fully live, which is one more step in an already multi-step onboarding flow. This is a worthwhile trade for the trust and cleanliness gained, but it will slightly slow coach activation. Budget for it in your "get 5 coaches live" timeline — add half a day per coach for identity verification to clear.
- **DVA transaction fee is real, even if small** — ₦300 cap per payout transaction is a cost LOBB absorbs or factors into the fee model. At 100 payouts/month, that's ₦30,000/month in DVA fees on top of standard Paystack processing fees. Build this into the unit economics.

### The Honest Recommendation

Move to the DVA model. It is the right architecture for exactly the reason you intuited from using Shuttlers — it makes the "where is my money" question answerable with a real bank account number instead of an internal ledger explanation. It also happens to solve the BVN/identity verification requirement from Part 1 in the same step, since DVA issuance for regulated business categories requires customer validation anyway. Two problems, one piece of infrastructure.

This is not a Week 1 fix — it requires the BVN collection flow to exist first (Part 1) and is more involved than the Transfer API approach in the existing payment documents. Sequence it as: ship the simpler Transfer API model first to get real bookings happening, then migrate to DVA once coach volume justifies the additional onboarding complexity. Do not block the first 10 bookings on building DVA infrastructure.

---

# PART 3 — THE REFERRAL SYSTEM: FULL SPECIFICATION

The previous GTM document described the referral *model* in business terms (₦1,500 per first booking). This section is the actual implementation spec — the logic, the data model, where it lives in the product, and the UI.

### The Core Logic

```
REFERRAL ATTRIBUTION LOGIC

1. Every approved coach gets a unique referral_code on profile approval
   (auto-generated: lowercase coach name + random 3-digit suffix if collision,
   e.g. "tpro", "emeka482")

2. Referral link format: lobb.ng/r/{referral_code}
   (short path — "/r/" not "/ref/" — fewer characters, easier to say out loud
   and type from a WhatsApp message)

3. When ANYONE visits lobb.ng/r/{code}:
   - LOBB sets a cookie: lobb_ref = {code}, expires in 30 days
   - Redirects to homepage (or directly to that coach's profile — see UX note below)
   - If a cookie already exists from a different referral code, DO NOT overwrite it
     (first-touch attribution — the first coach who referred them gets credit,
     not whoever they clicked last)

4. When that visitor signs up (phone OTP + role selection):
   - System checks for lobb_ref cookie
   - If present, store referred_by_coach_id on the new user record
   - This is permanent — does not expire after signup, only the cookie window
     before signup expires

5. When that referred user completes their FIRST paid booking (any coach,
   not necessarily the referring coach):
   - System checks: does this user have a referred_by_coach_id?
   - Is this their first completed booking? (check booking count for this user)
   - If both true: create a referral_credit record
     - referring_coach_id
     - referred_user_id
     - triggering_booking_id
     - amount: ₦1,500
     - status: pending → released (same 2-hour post-session timing as
       regular payouts, for consistency)

6. Referral credits accumulate in the coach's earnings dashboard as a
   separate line item from session earnings
   - Withdrawable once balance reaches ₦5,000 (batches micro-payouts,
     reduces transfer fee overhead)
```

### Why First Booking With ANY Coach (Not Just the Referring Coach)

This is an important design decision. If you only pay the referral fee when the referred player books *specifically* the referring coach, you create a perverse incentive: coaches will be reluctant to refer players to LOBB broadly, because the player might end up booking someone else and the referring coach gets nothing.

By paying the referral fee on the player's first booking with *any* coach, you reward the coach purely for bringing a new player into the LOBB ecosystem — which is the actual value they're creating. This is platform growth, not coach-specific competition. It also matches how the T-Pro conversation was framed: he is not trying to lock players into himself, he is happy to grow the overall pie because he sees the commercial upside either way.

### Data Model Addition

```sql
-- Add to coach_profiles table
ALTER TABLE coach_profiles ADD COLUMN referral_code VARCHAR(30) UNIQUE;

-- Add to users table
ALTER TABLE users ADD COLUMN referred_by_coach_id UUID REFERENCES coach_profiles(id);
ALTER TABLE users ADD COLUMN referred_at TIMESTAMPTZ;

-- New table
referral_credits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referring_coach_id    UUID REFERENCES coach_profiles(id),
  referred_user_id      UUID REFERENCES users(id),
  triggering_booking_id UUID REFERENCES bookings(id) UNIQUE,
  amount                INTEGER NOT NULL DEFAULT 1500,
  status                ENUM('pending', 'released', 'paid_out') DEFAULT 'pending',
  released_at           TIMESTAMPTZ,
  paid_out_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
)
```

### Where This Lives in the Product (UI)

**Coach Dashboard — new section:**

```
┌───────────────────────────────┐
│  My Referral Link             │
│                                │
│  lobb.ng/r/tpro                │  ← Tappable. Copies to clipboard on tap.
│  [Copy Link] [Share to WhatsApp]│  ← Share button opens WhatsApp with
│                                │     pre-filled message (see below).
│  12 sign-ups · 7 booked        │  ← Live count. Updates in real time.
│  ₦10,500 earned from referrals │  ← Separate from session earnings.
└───────────────────────────────┘
```

**Pre-filled WhatsApp share message (auto-generated, coach can edit):**

```
Hey! I've joined LOBB — makes it easy to book tennis sessions
with me directly, no back and forth. Book here: lobb.ng/r/tpro 🎾
```

This is generated by the "Share to WhatsApp" button using the `wa.me` URL scheme with pre-filled text — the coach taps once, picks who to send it to, and the message is already written. Removes all friction from the coach's side.

**Coach Earnings Dashboard — referral line item:**

```
┌──────────┬────────────────┬──────────────┐
│ ₦60,000  │   ₦10,500      │   ₦70,500    │
│ Session  │   Referral      │   Total      │
│ Earnings │   Earnings      │   Earnings   │
└──────────┴────────────────┴──────────────┘
```

**Player-side — invisible.** Players never see referral mechanics. They click a link, land on LOBB, and have a normal experience. The referral system should be completely silent from the player's perspective — no "you were referred by X" banner, no friction, no different flow. Attribution happens entirely in the background via the cookie.

### Landing Page Behavior for `/r/{code}` Links

Two options — pick one:

**Option A (recommended for MVP): Redirect to homepage**
Simplest to build. Sets the cookie, redirects to `/`. Player sees the standard LOBB homepage and browses normally.

**Option B (better conversion, more complex): Redirect to that coach's profile**
Sets the cookie, redirects to `/coaches/{coach-slug}`. Player lands directly on the referring coach's profile — higher intent, since they likely clicked because they know or were told about this specific coach. Slightly more dev work (need to map referral_code back to coach slug for the redirect) but meaningfully better conversion since it removes a browsing step.

**Recommendation: Build Option B.** It is barely more work than Option A (one extra lookup) and it matches the actual use case — when T-Pro shares his link in his WhatsApp group, his students want to book *him*, not browse all of LOBB. Sending them straight to his profile respects that intent.

### Anti-Abuse Considerations (Keep Simple for MVP, Don't Over-Engineer)

- One referral credit per unique referred user (enforced by the UNIQUE constraint on `triggering_booking_id` plus checking `referred_user_id` hasn't already triggered a credit)
- A coach cannot refer themselves (check: referred user's phone number cannot match the referring coach's own account phone)
- Minimum withdrawal threshold (₦5,000) naturally discourages fake-account farming for tiny amounts — not bulletproof, but sufficient for MVP scale
- Do not build fraud detection beyond this for MVP. At 20–50 referrals in Month 1, manual admin review of anything that looks unusual (same device, rapid signups, etc.) is sufficient. Automate this later if volume justifies it.

### Marketing Strategy Around the Referral System (As Your Marketing Manager)

If I were running marketing for LOBB, here is exactly how I would deploy this:

**1. Make the earnings visible and real, not hypothetical.**
The single biggest driver of coach participation is seeing real money land. The first time T-Pro's referral dashboard shows "₦1,500 earned" instead of "₦0," that screenshot becomes its own marketing asset. Ask him if you can share it (anonymized or with permission) with the next coach you onboard. Nothing recruits a coach faster than seeing another coach already getting paid.

**2. Create a simple leaderboard — but only once you have 5+ active referrers.**
"Top referring coaches this month" with a small reward for #1 (e.g., a featured placement on the homepage for a week) taps into the same competitive energy that makes coaches good at their actual job. Do not build this in Month 1 — wait until there's enough activity for a leaderboard to mean something. An empty or near-empty leaderboard is worse than no leaderboard.

**3. Tier the referral reward over time, not from day one.**
Keep ₦1,500 flat for MVP — simplicity wins early. But the natural Phase 2 evolution: ₦1,500 for the first 5 referrals in a month, ₦2,000 for the 6th–15th, ₦2,500 beyond that. This rewards your most active partner coaches (like T-Pro will likely become) without complicating the initial pitch to a brand-new coach.

**4. Use the referral mechanic as the coach acquisition pitch too.**
Right now the referral system rewards coaches for bringing *players*. The same mechanic, with a different reward, can recruit *other coaches*. "Refer a coach who completes their first 5 sessions, earn ₦5,000" — this is how T-Pro's "who else should be on LOBB" answer becomes a paid action instead of a favor. Build this as a second referral type once the player-referral system is proven (Month 2, not Month 1).

**5. Never let the referral system become the headline message.**
This is internal infrastructure for coach activation — it is not what gets shown to players, and it should not become LOBB's public personality ("the platform that pays you to refer!"). That framing cheapens the brand and shifts focus from "verified coach marketplace" to "referral scheme." Keep it operationally central, promotionally quiet. The T-Pro WhatsApp message above doesn't even mention the referral fee — it sells the booking convenience. The referral economics are between LOBB and the coach, not part of the public pitch to players.

---

# PART 4 — BRAND CRITIQUE: NAME, LOGO, COLORS

You asked directly: critique the brand. Here it is, briefly, since the full reasoning already exists in LOBB_Brand_Strategy.md. This is the short, current-state version.

### The Name — LOBB

**Still correct.** Nothing about the audit, the KYC work, or the payment research changes this. LOBB remains trademarkable, scalable past Nigeria, pronounceable across Yoruba/Pidgin/English, and free of direct competitor collision. No change recommended.

**One live risk to monitor:** as LOBB becomes a real product with real money moving through it, do a fresh trademark and domain conflict check before any press coverage or fundraising conversation — six months is enough time for the landscape to shift, and you want zero surprises at the point where visibility increases.

### The Logo

No logo has been designed yet in any document shared so far — only the wordmark treatment (uppercase LOBB, used as a top-left mark on the splash screen in the UI/UX document). That is fine for MVP. Do not commission a full logo system yet. A clean, confident wordmark in the right typeface carries you through launch and the first 100 bookings. Spend design budget on coach profile photo quality and court photography before spending it on logo refinement — the audit was explicit that supply quality matters more than visual polish at this stage, and that applies here too.

### The Colors

The palette defined in the UI/UX document — near-black, warm off-white, and a single terracotta/clay accent — is sound and was deliberately chosen to avoid the "generic Nigerian fintech blue" and "obvious tennis green/yellow" traps. The brutal audit's critique of "clay orange" was about *overuse and excessive editorial styling* (heavy uppercase tracking, glass effects, scroll reveals, numbered process rows) — not about the color choice itself being wrong. The fix from the audit response document (Fix 10, visual consistency pass) addresses this correctly: keep the palette, reduce the decorative techniques competing with actual product proof.

**No color change recommended.** The palette is differentiated and appropriate for the "premium Lagos Saturday morning" positioning. The execution discipline is what needs fixing, not the palette itself.

---

# SUMMARY — WHAT TO ACTUALLY DO WITH THIS DOCUMENT

1. **KYC:** Add NIN + BVN collection to coach onboarding, before admin profile review, not after. This is half a day of integration work using Paystack's customer validation, which you need anyway for Part 2.

2. **Payment architecture:** Keep the existing Transfer API model for the first 10 bookings — do not block launch on this. Build DVA as the Month 2 upgrade once coach volume justifies the added onboarding step. When you do, it directly answers your "I don't want to just say LOBB holds the money" discomfort with a real, named bank account per coach.

3. **Referral system:** Build the data model and coach dashboard section this is specified above. Use Option B (redirect to coach profile, not homepage) for the `/r/{code}` link. Keep the referral economics invisible to players and central to coach activation — this is internal infrastructure, not a public marketing hook.

4. **Brand:** No changes needed. Name, palette, and current wordmark direction are all sound. Spend the next design hour on coach photography and court photography, not on logo iteration.

---

*LOBB | May 2026*
