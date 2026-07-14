# Operations & Environments

How LOBB is deployed, what a proper staging setup looks like, and the
runbooks for the things that can break.

## Environment strategy (recommended)

Three tiers. The key principle: **staging is a real deployment against a real
(separate) Supabase project and Paystack test keys — not localhost.**

| Tier | Frontend | Database/Auth | Payments | Purpose |
|---|---|---|---|---|
| **Local** | `npm run dev` | shared *staging* Supabase | Paystack **test** keys | day-to-day development |
| **Staging** | Vercel preview deployments (every push to a non-main branch, or a pinned `staging` branch domain e.g. `staging.lobb.ng`) | dedicated **staging Supabase project** | Paystack **test** keys | integration testing, demoing, pre-release QA |
| **Production** | Vercel production (`lobb.ng`, deploys from `main`) | production Supabase project | Paystack **live** keys | real users, real money |

### Setting staging up (one-time, ~1 hour)

1. Create a second Supabase project (`lobb-staging`). Run every file in
   `supabase/migrations/` against it in order (or `supabase db push` with the
   CLI linked to the staging ref).
2. In Vercel → Project → Settings → Environment Variables, scope variables
   by environment: **Preview** gets the staging Supabase URL/keys + Paystack
   test keys; **Production** keeps the live set. Same variable names, so no
   code changes.
3. Configure the staging Supabase project identically: Email OTP length 6,
   send-email hook pointed at the preview URL, seed test accounts
   (`LOBB_ENABLE_TEST_OTP=true` is fine here — never in production).
4. Optional but recommended: a long-lived `staging` branch with a fixed
   domain assigned in Vercel, so QA links don't change per-push.
5. Point local `.env.local` at the **staging** project too — no developer
   should ever hold production service-role keys for daily work.

### Migration workflow

Migrations live in `supabase/migrations/` (timestamped, append-only — never
edit an applied file). Flow: write migration → apply to staging → test the
flows it touches → apply to production (SQL editor today; `supabase db push`
or the Supabase MCP once wired). **The repo is the source of truth**; the two
currently-pending production files are tracked in the deploy checklist below.

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

## Current deploy checklist (as of 2026-07-14)

- [ ] Run `supabase/migrations/20260713000001_fix_release_escrow.sql` in prod
- [ ] Run `supabase/migrations/20260714000001_db_cleanup.sql` in prod
- [ ] Set `CRON_SECRET` in Vercel (Production) and redeploy
- [ ] Register the live webhook URL in the Paystack dashboard
- [ ] Create the staging Supabase project + scope Vercel Preview env vars
