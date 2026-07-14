# Authentication

Passwordless email OTP via Supabase Auth. No passwords anywhere in the system.

## Signup

1. `/auth/signup/player` or `/auth/signup/coach` (or the generic `/auth/login?mode=signup` with role tabs).
   User enters email and accepts the legal checkboxes (Terms + Privacy, Cancellation & Refund).
2. Client calls `POST /api/auth/send-otp` with `{ email, role }`.
   - Signup mode uses `shouldCreateUser: true`; the chosen role is stored in
     `raw_user_meta_data.role`.
   - Supabase generates a **6-digit** code (dashboard: Authentication → Email →
     "Email OTP Length" — must match `NEXT_PUBLIC_OTP_LENGTH`).
   - The send-email auth hook (`/api/auth/email-hook`, secured with
     `SUPABASE_EMAIL_HOOK_SECRET`) delivers the code via Resend.
3. The pending request (email, mode, role, sentAt, accepted documents) is kept
   in `sessionStorage` (`lib/auth-flow.ts`) and the user lands on `/auth/verify`.
4. User enters the code → `POST /api/auth/verify-otp`:
   - Verifies via `supabase.auth.verifyOtp` and returns the session tokens.
   - Reads the `lobb_ref` referral cookie and stamps
     `profiles.referred_by_coach_id` (first touch only — never overwritten).
   - Client sets the session, records legal consent (`POST /api/legal/consent`
     → `consent_logs`), and routes by role (see Routing below).

### Database side of signup

`handle_new_user()` — an `AFTER INSERT` trigger on `auth.users` — creates:
- a `profiles` row (role from metadata; `full_name` **stays null** — a null
  name means "onboarding incomplete" and drives routing),
- a `coaches` row (status `draft`) or `players` row.

The whole trigger body is wrapped in an exception handler: a failure creating
public rows must never block the auth user itself. Two historical bugs to
never reintroduce here:
- deriving `full_name` from the email prefix (skips onboarding routing), and
- unqualified function calls (e.g. `gen_random_bytes`) inside downstream
  triggers — `supabase_auth_admin`'s search_path is only `auth`, so calls that
  work from the API explode inside signup. Use `pg_catalog` functions or
  schema-qualify everything.

## Login

Same flow with `shouldCreateUser: false`. If the email has no account,
send-otp returns **404** and the UI shows an inline "no account — sign up as
player / coach" alert with the email carried over. Codes are rate-limited by
Supabase (60s resend cooldown → surfaced as 429 with a friendly message).

## Verify-page routing

After a successful verify, `/auth/verify` routes by profile state:

| Profile state | Destination |
|---|---|
| coach + has full_name | `/coach/dashboard` |
| coach, no full_name | `/auth/setup/coach/1` (6-step onboarding) |
| player + has full_name | `/home` |
| player, no full_name | `/auth/setup/player` |
| admin | `/admin` |
| no profile row (trigger failed) | client-side upsert from intended role, then setup |
| no role and no intent | `/auth/role` picker |

A `?next=` path is honoured only if it passes `getSafeNextPath` (must be a
relative path and consistent with the user's role).

## Session & route protection

`src/middleware.ts` → `lib/supabase/middleware.ts` refreshes the Supabase
session cookie on every request and enforces role-based route groups:
`/admin/*` (admin), `/coach/*` (coach/admin), player areas (`/home`,
`/dashboard`, `/book`…). Logged-in users hitting `/` are bounced to their
dashboard. API routes never trust the client: `requireRole` / `withRole`
(`lib/api-auth.ts`) re-resolve the user and role server-side per request.

## Dev/test access

With `LOBB_ENABLE_TEST_OTP=true`, the seeded test accounts
(+2340000000001 player, +2340000000002 coach) accept a fixed OTP for local
testing. Never enable in production.

## Environment knobs

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_OTP_LENGTH` | Number of OTP boxes; must equal the Supabase dashboard setting (6) |
| `SUPABASE_EMAIL_HOOK_SECRET` | Verifies the auth send-email hook |
| `RESEND_API_KEY`, `EMAIL_FROM` | Delivery of OTP + transactional email |
| `ADMIN_EMAILS` | Bootstrap list for admin role assignment |
