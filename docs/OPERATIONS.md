# Operations & Environments

How LOBB is deployed, what a proper staging setup looks like, and the
runbooks for the things that can break.

## Environment strategy (as built)

Three tiers. **Staging is a real deployment against a real, separate
Supabase project and Paystack test keys — not localhost.**

| Tier | Frontend | Database/Auth | Payments | Purpose |
|---|---|---|---|---|
| **Local** | `npm run dev` | staging Supabase project | Paystack **test** keys | day-to-day development |
| **Staging** | Vercel Preview deployment, `staging` branch | dedicated **staging Supabase project** (`zvqkofnkjdgxlbtbwhct`) | Paystack **test** keys | integration testing, demoing, pre-release QA |
| **Production** | Vercel Production, `main` branch, `lobb.ng` | production Supabase project (`nnzddpvhldwjvhxbrrgh`) | Paystack **live** keys | real users, real money |

### Deployment topology — what actually happens on push

The `lobb` Vercel project is connected directly to `github.com/myekini/LOBB`.
No extra pipeline config is needed for this part — Vercel's GitHub
integration does it automatically:

- **Push to `main`** → Vercel builds and promotes straight to **Production**
  (`lobb.ng`), using the env vars scoped to *Production* in Vercel.
- **Push to `staging`** → Vercel builds a **Preview** deployment at
  `lobb-git-staging-myekinis-projects.vercel.app`, using the env vars scoped
  to *Preview*. Same code, different secrets — that's the whole trick.
- **Any other branch or PR** → also gets its own throwaway Preview URL
  automatically (Vercel does this for every branch by default); only `main`
  and `staging` have anything pointed at them deliberately.
- Preview deployments sit behind Vercel's Deployment Protection (SSO wall) by
  default — disabled for the `staging` branch so QA links work without a
  Vercel login (Project → Settings → Deployment Protection).

**What Vercel does NOT do:** touch the database. A `git push` only ships
application code. Database changes are a separate step — see below.

### Database migrations now apply automatically too

`.github/workflows/db-migrate.yml` runs on every push that touches
`supabase/migrations/**`:

- push to `staging` → replays every file in `supabase/migrations/` against
  the **staging** database
- push to `main` → replays every file against **production**

It works by literally running each `.sql` file through `psql` in filename
order — no separate migration-history table to keep in sync. This is safe
*because* every migration in this repo is written idempotently (`create
table if not exists`, `create or replace function`, `drop ... if exists`,
`do $$ ... exception when duplicate_object then null $$`) — replaying the
full history every time is a deliberate design choice, not a shortcut.
**Keep writing migrations this way** and the pipeline needs zero maintenance.

One-time setup: add two repo secrets (GitHub → Settings → Secrets and
variables → Actions):

| Secret | Where to get it |
|---|---|
| `STAGING_DB_URL` | Staging Supabase → Project Settings → Database → Connection string → **URI** (Session pooler), password filled in |
| `PROD_DB_URL` | Same, for the production project |

Once both secrets exist, **the manual "paste this SQL in the editor" step is
retired** — future migrations ship by merging to `staging`, testing, then
merging to `main`, exactly like application code.

### Setting staging up (one-time — done; keep for reference)

1. Create a second Supabase project. Run every file in `supabase/migrations/`
   against it in order (the `db-migrate` workflow now does this on every push
   once the secret is added — the very first run needs the two repo secrets
   in place, or a manual paste for the initial bootstrap).
2. Vercel → Project → Settings → Environment Variables, scoped to
   **Preview**: staging Supabase URL/keys, Paystack **test** keys, staging
   app URL. Production keeps the live set. Same variable names, no code
   changes required.
3. Staging Supabase → Authentication → Email: OTP length **6**, and a Send
   Email hook pointed at `https://<staging-url>/api/auth/email-hook` using
   the **same** `SUPABASE_EMAIL_HOOK_SECRET` as production (it's shared
   across both scopes in Vercel).
4. `staging` branch pinned in Vercel with Deployment Protection disabled, so
   QA links are stable and reachable without a login wall.
5. Never hold a production service-role key on a developer machine for daily
   work — point local `.env.local` at staging.

### Resetting staging data

Staging accumulates test signups/bookings over time. To wipe it back to an
empty (but fully migrated) state: delete every row in `auth.users` via the
Supabase Auth admin API or dashboard — profiles, coaches, players, bookings,
payments, and everything else cascade-delete via foreign keys. Two tables
don't cascade from a user and need a separate truncate: `paystack_events` and
`admin_audit_log`. The schema itself is untouched by this — only data.

## Environment variables (production checklist)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client keys |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — never expose |
| `SUPABASE_EMAIL_HOOK_SECRET` | must match the auth hook config |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | live keys in prod |
| `PAYSTACK_WEBHOOK_SECRET` | = the **secret key** (Paystack signs with it) |
| `CRON_SECRET` | **required** — Vercel Cron authenticates with it |
| `ADMIN_SECRET` | manual cron/ops invocations |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | verified domain, DKIM/SPF green |
| `NEXT_PUBLIC_OTP_LENGTH` | = Supabase dashboard OTP length (6) |
| `NEXT_PUBLIC_APP_URL` | `https://lobb.ng` — used in emails/links |
| `LOBB_ENABLE_TEST_OTP` | **absent/false in production** |

`NEXT_PUBLIC_*` values bake in at **build time** — changing one requires a
redeploy.

## Scheduled jobs (vercel.json crons)

All authenticate via `CRON_SECRET` (Vercel) or `ADMIN_SECRET` (manual).

| Cron | Schedule (UTC) | Does |
|---|---|---|
| `expire-pending-bookings` | 06:00 | cancels unpaid bookings, frees slots |
| `release-escrow` | 02:00 | completes ended sessions, pays coaches, mints + pays referral credits |
| `ops-alerts` | 07:00 | anomaly detection → admin alert email |
| `admin-digest` | 09:00 | daily numbers to admins |
| `notifications/process-due` | 02:00 | sends due reminder jobs |
| `notifications/schedule-booking-jobs` | 08:00 | queues session reminders |

Manual trigger (any of them):
`curl -H "Authorization: Bearer $ADMIN_SECRET" https://lobb.ng/api/cron/release-escrow`

## Deploy runbook

1. Merge to `main` → Vercel builds and deploys automatically.
2. If the release includes migrations: apply them to staging first, then to
   production **before** the deploy goes live (they are written to be
   backwards-compatible with the previous app version).
3. Post-deploy smoke test (5 min): login OTP arrives and verifies → coach
   slots load on a public profile → a test booking reaches Paystack checkout
   → `/admin` loads for an admin.
4. Watch Vercel Functions logs + Resend deliveries for the first minutes.

## Monitoring & alerting

- **In-app**: `ops-alerts` cron (stuck transfers, failure spikes) + admin
  digest.
- **Vercel**: function logs and cron run history (check after each deploy).
- **Paystack dashboard**: webhook delivery failures, transfer balance —
  transfers **fail silently as a class** if the Transfers balance is unfunded;
  check it weekly at current volume.
- **Supabase**: auth logs for OTP delivery issues; database health tab.
- Recommended next: a `/api/health` endpoint + external uptime ping
  (UptimeRobot free tier), and Sentry for error aggregation.

## Backups & recovery

- Supabase Pro takes daily automatic backups (verify the plan tier!). For
  belt-and-braces, schedule a weekly `pg_dump` via GitHub Actions to private
  storage.
- Paystack is the financial source of truth — `paystack_events` +
  `payments.paystack_reference` allow full reconciliation of money state
  after any DB incident.

## Current deploy checklist (as of 2026-07-19)

Done: `CRON_SECRET` set in Production, live webhook registered, staging
Supabase project created + Vercel Preview env vars scoped, staging data
wiped, `release_escrow` fix live in production.

- [ ] Run `scripts/prod-finish-cleanup.sql` in production (an earlier cleanup
      migration partially landed — `paystack_subaccount_code` was dropped but
      `otp_verifications` was not; this finishes it)
- [ ] Run `supabase/migrations/20260719000001_writable_session_columns.sql`
      in **both** staging and production — on production this fixes a live
      bug: `platform_commission_ngn` has been silently under-reported (~5%
      instead of the correct 15%) on every booking since launch, corrupting
      the admin earnings dashboard. Actual charges and coach payouts are
      unaffected.
- [ ] Add `STAGING_DB_URL` and `PROD_DB_URL` repo secrets so
      `.github/workflows/db-migrate.yml` takes over future migrations
- [ ] Configure the staging Supabase email hook (send-otp currently fails on
      staging without it)
