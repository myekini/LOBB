# Supabase Dashboard Setup — Manual Checklist

Everything here is a **dashboard toggle**, not something a migration can set —
do it once per project. Apply to both:

- **Production**: `nnzddpvhldwjvhxbrrgh` (dashboard: supabase.com/dashboard/project/nnzddpvhldwjvhxbrrgh)
- **Staging**: `zvqkofnkjdgxlbtbwhct` (dashboard: supabase.com/dashboard/project/zvqkofnkjdgxlbtbwhct)

## 1. Authentication → Sign In / Providers → Email

- [ ] **Email OTP Length = 6** (must match `NEXT_PUBLIC_OTP_LENGTH` in Vercel)
- [ ] **Email OTP Expiration** ≤ 3600s
- [ ] "Confirm email" stays **ON**
- [ ] Prod only: **disable** any test/bypass options staging might use

## 2. Authentication → URL Configuration

The app verifies OTP codes directly via API (`verifyOtp` with a token) — it
does **not** use magic-link redirects — so this isn't a hard blocker, but set
it correctly anyway for Supabase's own internal defaults and any future flow
that needs it (e.g. password reset, which isn't used today but might be).

| Field | Production | Staging |
|---|---|---|
| Site URL | `https://lobb.ng` | `https://staging.lobb.ng` |
| Redirect URLs (allowlist) | `https://lobb.ng/**` | `https://staging.lobb.ng/**`, `https://lobb-git-staging-myekinis-projects.vercel.app/**` |

## 3. Authentication → Hooks → Send Email

Both projects deliver OTP codes via a custom hook to Resend, not Supabase's
built-in SMTP.

- [ ] **Enabled**, pointing at `https://<app-url>/api/auth/email-hook`
  - Production: `https://lobb.ng/api/auth/email-hook`
  - Staging: `https://staging.lobb.ng/api/auth/email-hook` (or the `.vercel.app` URL until the domain is wired)
- [ ] Secret matches `SUPABASE_EMAIL_HOOK_SECRET` in Vercel for that
  environment (production and Preview currently share the **same** secret
  value in Vercel — keep the hook secret identical on both Supabase projects
  too, or split them if you'd rather isolate)

**Staging is currently missing this** — that's why `send-otp` 500s there
today. This is the one item actively blocking staging right now.

## 4. Authentication → Hooks → Custom Access Token

The app embeds `role` into the JWT via `custom_access_token_hook()` (defined
in `supabase/migrations/20260624000002_functions.sql`) so middleware can
route by role without a DB round-trip on every request. There's a graceful
fallback to a `profiles` query if the claim is missing, so this is a
**performance/consistency item, not a blocker** — but should be on for both:

- [ ] Enable **Custom Access Token** hook → function `custom_access_token_hook`

## 5. Database → Extensions

- [ ] `pgcrypto` enabled (used for `gen_random_uuid()`/`gen_random_bytes()` in
  migrations — usually on by default on new projects, confirm anyway)

## 6. Project Settings → API

- [ ] Confirm the four values in Vercel match this project exactly: URL,
  anon/publishable key, service-role key. (Mismatches here are the #1 cause
  of "works locally, 500s on staging" bugs.)

## 7. Verify end to end

After all of the above, per environment:

1. Request a login code on that environment's URL — it should arrive within
   seconds (Resend dashboard → Emails, filter by recipient, should show
   `delivered`).
2. Enter the code — should verify and route to the right dashboard (player →
   `/home`, coach → `/coach/dashboard`, admin → `/admin`).
3. Load a coach's public profile and confirm slots render (proves
   `get_coach_available_slots` + `coach_profiles_public` view are both
   healthy).
