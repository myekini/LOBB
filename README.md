<p align="center">
  <img src="./brand-kit/logos/lobb-logo-with-tagline.svg" alt="LOBB — Book a coach. Not a favor." width="420" />
</p>

<p align="center">
  <strong>Lagos tennis coaching marketplace for players, coaches, and operators.</strong>
</p>

<p align="center">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-14.2-black?logo=nextdotjs" /></a>
  <a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff" /></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=fff" /></a>
  <a href="https://supabase.com"><img alt="Supabase" src="https://img.shields.io/badge/Supabase-Ready-3FCF8E?logo=supabase&logoColor=fff" /></a>
  <img alt="Build" src="https://img.shields.io/badge/build-passing-2D6A4F" />
  <img alt="Brand" src="https://img.shields.io/badge/brand-LOBB_CLAY-C4622D" />
</p>

---

## Overview

LOBB is a production-ready MVP for booking verified tennis coaches in Lagos. It includes the complete player journey, coach operations workspace, and admin control panel in one Next.js application.

The product promise is simple:

> Book a coach. Not a favor.

## Product Surface

| Area | Routes | Purpose |
| --- | --- | --- |
| Public | `/`, `/coaches`, `/coaches/[slug]` | Landing, coach discovery, public coach profile |
| Auth | `/auth/login`, `/auth/verify`, `/auth/role`, `/auth/setup/player`, `/auth/setup/coach/1` | WhatsApp OTP, role selection, onboarding |
| Booking | `/book/[coachSlug]/step-1`, `/step-2`, `/step-3`, `/book/confirm` | Slot confirmation, session details, payment summary, confirmation |
| Player | `/dashboard`, `/dashboard/bookings/[id]`, `/dashboard/review/[bookingId]`, `/profile` | My bookings, detail view, reviews, profile |
| Coach | `/coach/dashboard`, `/coach/bookings`, `/coach/bookings/[id]`, `/coach/earnings`, `/coach/profile`, `/coach/availability`, `/coach/profile/preview` | Coach operations, schedule, earnings, profile management |
| Admin | `/admin`, `/admin/coaches`, `/admin/bookings`, `/admin/disputes`, `/admin/earnings` | Platform oversight, approvals, booking log, disputes, GMV |
| Support/Legal | `/how-it-works`, `/faq`, `/terms`, `/privacy` | MVP-ready support and legal placeholders |

## Core Features

- WhatsApp-style OTP onboarding with a development test OTP.
- Role-aware routing for players, coaches, and admins.
- Player booking flow with slot selection, session details, payment summary, and confirmation.
- Player dashboard with upcoming and past sessions.
- Coach dashboard with weekly metrics, next session, bookings, earnings, profile editor, availability manager, and public preview.
- Admin dashboard with platform overview, coach approval queue, booking log, dispute resolution, and platform earnings.
- Middleware route guards for protected player, coach, and admin workspaces.
- LOBB brand kit, logos, favicons, verified badge, and design-system preview.

## Brand System

The LOBB visual system is intentionally restrained: black, clay, off-white surfaces, and dense operational UI.

| Token | Hex | Use |
| --- | --- | --- |
| `--lobb-black` | `#0D0D0D` | Primary text, dark cards, active navigation |
| `--lobb-clay` | `#C4622D` | Primary CTA, emphasis, booking actions |
| `--lobb-bg` | `#F2F1EF` | App background |
| `--lobb-surface` | `#FAFAFA` | Cards and panels |
| `--lobb-muted` | `#8A8A8A` | Secondary copy |
| `--lobb-success` | `#2D6A4F` | Confirmed, approved, success states |
| `--lobb-star` | `#F4A228` | Ratings and review stars |

Brand assets live in:

```txt
brand-kit/
  brand-preview.html
  logos/
  badges/
  favicons/
```

Open the design system locally:

```bash
start brand-kit/brand-preview.html
```

## Tech Stack

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn/base-ui primitives
- Supabase Auth, Database, Storage-ready helpers
- Paystack-ready payment UI
- Termii/Twilio-ready SMS/WhatsApp OTP layer
- Lucide icons

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
copy .env.example .env.local
```

Run the dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Development OTP

For local testing, the app supports a default OTP:

```txt
000000
```

Environment controls:

```env
LOBB_TEST_OTP=000000
NEXT_PUBLIC_LOBB_TEST_OTP=000000
LOBB_ENABLE_TEST_OTP=
```

Production disables the test OTP unless explicitly enabled.

## Environment Variables

See `.env.example` for the full list.

Important groups:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `TERMII_API_KEY`
- `SMS_PROVIDER`
- `TWILIO_*`

Never commit `.env.local`. It is already ignored.

## Quality Gates

Run a production build:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Current status:

```txt
npm run build: passing
```

## Route Protection

Middleware protects role-specific spaces:

- Unauthenticated users are sent to `/auth/login?next=...`
- Coaches are sent to `/coach/dashboard`
- Players are sent to `/`
- Admin routes require the `admin` role
- Deep links are preserved through OTP verification when safe for the user's role

## Repository Structure

```txt
src/
  app/                 Application routes
  components/          Shared UI shells, nav, cards, primitives
  lib/                 Mock data, auth helpers, Supabase clients, SMS helpers
brand-kit/             LOBB identity system and SVG assets
supabase/              Supabase project artifacts
```

## Production Notes

- Rotate any real keys that have been shared outside a secure secret manager.
- Replace MVP legal placeholders before public launch.
- Wire booking, approval, payout, and dispute actions to persistent database tables.
- Connect Paystack inline/payment callback before accepting real payments.
- Move mock booking/admin data to Supabase queries behind RLS policies.

## License

Private. All rights reserved.
