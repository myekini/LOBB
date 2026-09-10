import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Star } from "lucide-react";
import type { CoachPublicProfile } from "@/lib/types";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LandingReveal } from "@/features/marketing/landing-reveal";

const HERO_IMAGE = "/court-hero.jpg";

function LobbMark({ size = 24, color = "#C4622D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="17" r="5.5" fill={color} />
    </svg>
  );
}

function coachRate(value: number | null) {
  return value == null ? "Rate TBD" : `₦${value.toLocaleString("en-NG")}/hr`;
}

function DotLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[13px] font-medium text-[var(--lobb-text-secondary)]">
      <span className="size-1.5 shrink-0 bg-[var(--lobb-clay)]" aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * Public marketing landing. Server-rendered — middleware redirects every
 * signed-in visitor to their app, so this only ever renders for logged-out
 * users, and the coach list is fetched on the server by the route.
 */
export function LandingSplash({ coaches }: { coaches: CoachPublicProfile[] }) {
  const heroCoach = coaches[0] ?? null;

  return (
    <main id="main-content" className="lobb-landing relative min-h-[100dvh] overflow-x-hidden text-[var(--lobb-text-primary)]">
      <LandingReveal />

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="lobb-landing-top-gradient absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(180deg,var(--lobb-bg-secondary),transparent)]" />
      </div>

      <header className="lobb-landing-header sticky top-0 z-30 border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/88 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 md:justify-self-start">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition duration-300 group-hover:border-[var(--lobb-clay)]/45">
              <LobbMark size={18} />
            </span>
            <span className="hidden text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--lobb-text-primary)] sm:inline">LOBB</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center justify-self-center gap-8 text-sm font-medium text-[var(--lobb-text-secondary)] md:flex">
            <Link href="/coaches" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">Coaches</Link>
            <Link href="/how-it-works" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">How it works</Link>
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">About</Link>
          </nav>

          <div className="flex shrink-0 items-center justify-self-end gap-1 sm:gap-2">
            <Link href="/auth/login" className="inline-flex h-10 items-center justify-center rounded-[var(--lobb-radius-lg)] px-3 text-sm font-medium text-[var(--lobb-text-secondary)] transition hover:text-[var(--lobb-text-primary)] sm:px-4">
              Sign in
            </Link>
            <ThemeToggle className="size-10 rounded-[var(--lobb-radius-md)]" />
            <Link href="/coaches" className="lobb-cta-sheen hidden h-10 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)] transition duration-300 hover:bg-[var(--lobb-clay)] hover:text-white active:scale-[0.98] sm:inline-flex">
              Browse coaches
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] lg:px-8 lg:py-16">
        <div className="max-w-3xl animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <p className="mb-5 text-sm font-medium text-[var(--lobb-clay)]">Verified tennis coaching in Lagos</p>

          <h1 className="max-w-3xl text-[44px] font-semibold leading-[0.98] tracking-tight text-[var(--lobb-text-primary)] sm:text-[64px] lg:text-[76px] text-balance">
            Skip the WhatsApp chase. Book a verified tennis coach.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-7 text-[var(--lobb-text-secondary)] sm:text-[18px] text-pretty">
            Compare verified coaches, see upfront rates and reserve a real time—all in one place.
          </p>

          <div className="mt-8">
            <Link href="/coaches" className="lobb-cta-sheen group inline-flex h-14 w-full items-center justify-center gap-2 bg-[var(--lobb-clay)] px-7 text-sm font-semibold text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98] sm:w-auto">
              Browse coaches
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <p className="mt-5 text-sm text-[var(--lobb-text-secondary)]">Verified profiles · Upfront pricing · Secure payment</p>
        </div>

        <div className="relative animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-150">
          <div className="lobb-hero-visual group relative min-h-[390px] overflow-hidden border border-white/15 bg-[#0d0d0d] sm:min-h-[440px]">
            <Image
              src={HERO_IMAGE}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="scale-105 object-cover opacity-[0.88] transition duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.05),rgba(13,13,13,0.9)),linear-gradient(90deg,rgba(13,13,13,0.72),rgba(13,13,13,0.08)_48%,rgba(13,13,13,0.76)),radial-gradient(circle_at_78%_18%,rgba(196,98,45,0.34),transparent_28%)]" aria-hidden="true" />

            <div className="relative grid min-h-[390px] content-end p-5 sm:min-h-[440px] sm:p-7">
              <div className="max-w-[390px] border border-white/15 bg-[#0d0d0d]/78 p-4 text-white backdrop-blur-md sm:p-5">
                <p className="text-xs font-medium text-white/70">Featured coach</p>
                <h2 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-balance">
                  {heroCoach?.full_name ?? "Verified coaching across Lagos"}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                  {heroCoach?.primary_location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-[var(--lobb-clay)]" />{heroCoach.primary_location}</span>}
                  {heroCoach?.avg_rating != null && <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />{Number(heroCoach.avg_rating).toFixed(1)}</span>}
                  {heroCoach?.hourly_rate_ngn != null && <span>{coachRate(heroCoach.hourly_rate_ngn)}</span>}
                </div>
                <Link data-keep-light href={heroCoach ? `/coaches/${heroCoach.slug ?? heroCoach.id}` : "/coaches"} className="mt-5 inline-flex h-11 items-center gap-2 bg-white px-4 text-sm font-semibold text-[#0d0d0d] transition hover:bg-[var(--lobb-clay)] hover:text-white">
                  {heroCoach ? "View coach profile" : "Browse coaches"}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-12 sm:px-6 lg:px-8 lg:pt-16">
        <div data-reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <DotLabel>Coaches on LOBB</DotLabel>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.04] tracking-tight sm:text-[38px] text-balance">Choose with confidence.</h2>
          </div>
          <Link href="/coaches" className="group hidden items-center gap-2 text-sm font-semibold transition hover:text-[var(--lobb-clay)] sm:inline-flex">View all <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
        </div>
        {coaches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {coaches.slice(0, 3).map((coach) => <LandingCoachSummary key={coach.id} coach={coach} />)}
          </div>
        ) : (
          <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-sm text-[var(--lobb-text-secondary)]">New coaches are being verified across Lagos.</div>
        )}
        <Link href="/coaches" className="mt-4 flex h-12 items-center justify-center gap-2 border border-[var(--lobb-border-subtle)] text-sm font-semibold sm:hidden">View all coaches <ArrowRight className="size-4" /></Link>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-8 lg:py-24">
        <div data-reveal className="lg:sticky lg:top-24 lg:self-start">
          <DotLabel>How booking works</DotLabel>
          <h2 className="mt-3 max-w-md text-[32px] font-semibold leading-[1.02] tracking-tight sm:text-[44px] text-balance">
            Three steps from search to court.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--lobb-text-secondary)]">
            No referral chase, price negotiation or back-and-forth scheduling.
          </p>
        </div>
        <div>
          {([
            ["Choose a coach", "Compare experience, coaching style, location and price before you decide."],
            ["Pick a time and pay", "Select an open slot. We hold it while you complete secure payment."],
            ["Meet on court", "Your booking, location and session details stay together in one place."],
          ] as const).map(([title, body], i) => (
            <div
              key={title}
              data-reveal
              style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
              className="group grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-t border-[var(--lobb-border-subtle)] py-7 transition duration-300 last:border-b sm:grid-cols-[88px_minmax(0,1fr)]"
            >
              <span className="text-[30px] font-semibold leading-none tracking-tight text-[var(--lobb-text-tertiary)] transition-colors duration-300 group-hover:text-[var(--lobb-clay)] sm:text-[40px]">
                0{i + 1}
              </span>
              <div className="transition-transform duration-300 group-hover:translate-x-1">
                <p className="text-xl font-semibold tracking-tight">{title}</p>
                <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--lobb-text-secondary)]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lobb-landing-band relative z-10 border-y border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]/58 px-4 py-12 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl md:grid-cols-3">
          {([
            ["Verified profiles", "Review coaching experience, location and player feedback before you book."],
            ["The full price upfront", "See the coach's rate and LOBB's 5% convenience fee before you pay."],
            ["Clear cancellation terms", "Cancel at least 24 hours ahead for a full refund. Later cancellations receive 50%."],
          ] as const).map(([title, body], i) => (
            <div
              key={title}
              data-reveal
              style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
              className="border-b border-[var(--lobb-border-subtle)] py-6 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:py-2 md:first:pl-0 md:last:border-r-0"
            >
              <p className="text-lg font-medium tracking-tight">{title}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--lobb-text-secondary)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div data-reveal className="lobb-landing-panel grid gap-8 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:p-12">
          <div>
            <DotLabel>For coaches</DotLabel>
            <h2 className="mt-3 max-w-2xl text-[32px] font-semibold leading-[1.02] tracking-tight sm:text-[44px] text-balance">
              Spend less time arranging lessons.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--lobb-text-secondary)]">
              Publish your profile and availability, receive prepaid bookings and manage each session from one place.
            </p>
          </div>
          <div className="lg:text-right">
            <Link href="/auth/signup/coach" className="lobb-cta-sheen group inline-flex h-12 items-center justify-center gap-2 bg-[var(--lobb-bg-inverse)] px-6 text-sm font-semibold text-[var(--lobb-text-inverse)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--lobb-clay)]">
              Apply to coach on LOBB
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="lobb-dark-band relative z-10 overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div
          className="absolute inset-0 opacity-[0.16] mix-blend-screen"
          style={{ backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(196,98,45,0.28),transparent_60%),linear-gradient(180deg,rgba(13,13,13,0.65),rgba(13,13,13,0.35))]" aria-hidden="true" />
        <div data-reveal className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-[40px] font-semibold leading-[0.98] tracking-tight sm:text-[60px] text-balance">
            Your next tennis session starts here.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.7] text-white/75">
            Browse verified coaches available across Lagos.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/coaches" className="lobb-cta-sheen group inline-flex h-14 w-full items-center justify-center gap-2 bg-[var(--lobb-clay)] px-8 text-sm font-semibold text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98] sm:w-auto">
              Find a coach
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="lobb-landing-header relative z-10 border-t border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/88 px-4 py-7 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <LobbMark size={18} />
            <span className="text-[12px] font-medium uppercase tracking-[0.18em]">LOBB</span>
            <span className="text-[12px] font-medium text-[var(--lobb-text-secondary)]">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-secondary)]">
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">About</Link>
            <Link href="/faq" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">FAQ</Link>
            <Link href="/terms" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">Terms</Link>
            <Link href="/privacy" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">Privacy</Link>
            <Link href="/cancellation-policy" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">Cancellation</Link>
            <Link href="/contact" className="lobb-nav-link transition hover:text-[var(--lobb-text-primary)]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function LandingCoachSummary({ coach }: { coach: CoachPublicProfile }) {
  const href = `/coaches/${coach.slug ?? coach.id}`;
  return (
    <Link href={href} className="lobb-landing-panel group overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--lobb-clay)]/35">
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--lobb-bg-secondary)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.profile_photo_url} alt={coach.full_name} className="size-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl font-semibold text-[var(--lobb-text-tertiary)]">{coach.full_name.charAt(0)}</div>
        )}
        {coach.hourly_rate_ngn != null && <span className="absolute bottom-3 left-3 bg-[#0d0d0d]/82 px-2.5 py-1.5 text-xs font-medium text-white">{coachRate(coach.hourly_rate_ngn)}</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{coach.full_name}</h3>
            <p className="mt-1 line-clamp-1 text-sm text-[var(--lobb-text-secondary)]">{coach.headline ?? "Tennis coach"}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium"><Star className="size-3.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />{coach.avg_rating != null ? Number(coach.avg_rating).toFixed(1) : "New"}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--lobb-border-subtle)] pt-3 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--lobb-text-secondary)]"><MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" /><span className="truncate">{coach.primary_location ?? "Lagos"}</span></span>
          <span className="ml-3 inline-flex shrink-0 items-center gap-1 font-semibold">View profile <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></span>
        </div>
      </div>
    </Link>
  );
}
