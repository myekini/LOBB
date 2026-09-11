# Security

What LOBB implements today, layer by layer, and the honest gap list.
Threat model in one line: **a payments marketplace — protect user identity
data (NIN/BVN), prevent unauthorized money movement, keep tenant data
separated.**

## Authentication & sessions

- Email verification code (Supabase Auth) is a **one-time signup cost only**.
  Returning users sign in with a password, or a passkey (WebAuthn) when
  `NEXT_PUBLIC_LOBB_ENABLE_PASSKEYS` is on — never another code. "Email me a
  code" and password-reset both stay available as fallbacks.
- OTP length 6, ~10-minute expiry, Supabase-enforced rate limits and 60s
  resend cooldown (surfaced as 429). Signup OTP requests are additionally
  gated by Cloudflare Turnstile when configured (`TURNSTILE_SECRET_KEY`) —
  fails open if unset, never blocks users because a key is missing.
- Sessions are Supabase JWTs in httpOnly cookies, refreshed by middleware on
  every request. Logout revokes server-side. Refresh-token expiry should be
  60–90 days with rotation on (dashboard setting, see SETUP.md §4b) so a
  normal login never needs a fresh code.
- The send-email auth hook validates `SUPABASE_EMAIL_HOOK_SECRET` before
  sending anything.
- Test-OTP backdoor is gated by `LOBB_ENABLE_TEST_OTP` (env, absent in prod)
  — never by `NODE_ENV` alone.
- `clientIp()` reads `cf-connecting-ip` first — required once the app sits
  behind Cloudflare, or every request would share one IP and per-IP rate
  limits would collapse into a single bucket.

## Authorization (defense in depth — three layers)

1. **Middleware** (`lib/supabase/middleware.ts`): role-gated route groups —
   `/admin` (admin), `/coach/*` (coach/admin), player areas. Wrong-role users
   are redirected, `?next=` targets validated against role
   (`getSafeNextPath` also blocks open redirects: relative paths only).
2. **API routes**: every non-public route runs `withRole`/`requireRole`,
   which re-resolves the user and role server-side per request — client
   claims are never trusted. Participant checks on object access (a player
   can only cancel/report their own booking).
3. **Postgres RLS**: enabled on every table. Public reads go through the
   `coach_profiles_public` view (payout/identity columns excluded); coaches
   read/update only their own rows; `otp`/`events`/jobs tables are
   service-role only. Even a leaked anon key exposes nothing private.

## Money-movement controls

- All amounts computed **server-side**; client never supplies prices.
- Paystack webhook: HMAC-SHA512 signature verified against the raw body
  (`x-paystack-signature`) before any processing; events deduplicated in
  `paystack_events` (replay-safe).
- Transfers are idempotent by reference (`{payment_ref}-payout`) — retries
  cannot double-pay. Manual payouts are admin-only and audit-logged.
- Escrow release requires the session to have actually ended
  (`ends_at <= now()` inside the SQL function, not just app code).
- Disputes freeze payouts at the DB-status level; the cron structurally
  skips non-`confirmed`/`completed` bookings.
- Cron endpoints require `CRON_SECRET`/`ADMIN_SECRET` bearer auth.
- Refunds flow only through Paystack's Refund API to the original payment
  method — no manual account entry anywhere.

## Sensitive data (NIN/BVN/KYC)

- Collected with explicit consent (logged in `consent_logs` with document
  type and timestamp).
- **Encrypted at rest** — app-level AES-256-GCM (`src/lib/crypto.ts`),
  `coaches.nin_encrypted`/`bvn_encrypted`, key (`KYC_ENCRYPTION_KEY`) held
  only in server env vars, never in the DB or client. Decrypted only
  server-side, only where a raw value is required (KYC submission, the
  Paystack BVN-validation call) — see FLOWS.md's KYC section.
- Never exposed via public views or client-readable RLS paths; the browser
  only ever gets masked status flags (`kyc_status`, `has_nin`, `has_bvn`) via
  `GET /api/coaches/kyc-status` — it never selects the encrypted columns
  directly.
- Old plaintext `nin`/`bvn` columns are being retired: a one-off backfill
  (`scripts/backfill-kyc-encryption.ts`) migrates existing rows, then the
  columns are dropped per environment once verified (see SETUP.md §4f).
- Retention period and NDPC/CBN registration status are not yet confirmed by
  counsel — see LEGAL.md. Don't restate a specific retention figure in
  product copy until that's settled.

## Database-side hardening

- SQL functions that cross privilege boundaries are `security definer` with
  pinned `search_path` (the auth-trigger incident — unqualified
  `gen_random_bytes` — is documented in flows/authentication.md; use
  `pg_catalog` or schema-qualified calls).
- `handle_new_user` wrapped in an exception handler so public-row failures
  can't corrupt auth signup; repair backfills exist as migrations.
- `set_coach_availability` verifies `auth.uid()` matches the target coach.

## Auditability

- `admin_audit_log`: every coach decision, manual payout, dispute
  open/resolve — with actor, target, metadata.
- `paystack_events`: full webhook history.
- `consent_logs`: who accepted which legal document when.

## Known gaps (prioritised)

1. **No app-level rate limiting** beyond Supabase's OTP limits and the
   in-memory limiter on auth routes (`lib/rate-limit.ts`, per-instance —
   doesn't share state across serverless instances) — booking and report
   endpoints could still be hammered. Put a Cloudflare rate-limit rule in
   front (see CLOUDFLARE.md) or move to an Upstash-based limiter.
2. **No security headers** configured (CSP, X-Frame-Options, HSTS) — add a
   `headers()` block in `next.config.mjs`. Low effort, real win.
3. **Old plaintext `nin`/`bvn` columns still exist** until the backfill is
   confirmed and they're dropped per environment (SETUP.md §4f) — not a
   fresh gap, but not fully closed either until that happens everywhere.
4. **NIN/BVN not yet verified against a provider** (stub pending CAC) — the
   identity layer currently rests on the bank-name match. Smile
   Identity/VerifyMe fills `verifyNIN()` in `src/lib/kyc.ts` once available.
5. **No 2FA for admin accounts** — admin sign-in is single-factor (password
   or email code); consider requiring a second factor or IP allowlisting for
   `/admin`.
6. **Dependency scanning**: enable GitHub Dependabot + `npm audit` in CI.
7. **No CSRF tokens** — mitigated by SameSite=Lax cookies and JSON-only APIs,
   but worth revisiting if any form-POST endpoints appear.
8. **NDPC registration and vendor DPAs not confirmed** — see LEGAL.md. This
   is a compliance gap, not a code gap.
