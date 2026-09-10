"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Input as LobbInput } from "@/components/ui/input";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, MapPin, Moon, Search, Star, Sun, Sunrise } from "lucide-react";
import { courtImage } from "@/lib/demo-content";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
import { SkeletonBlock, SmallCoachCardSkeleton } from "@/components/common/lobb-skeleton";
import { ThemeToggle } from "@/components/common/theme-toggle";

function LobbMark({ size = 24, color = "#C4622D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="17" r="5.5" fill={color} />
    </svg>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeMood() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return {
      Icon: Sunrise,
      period: "Morning",
      prompt: "Book a clean morning hit.",
      detail: "Early sessions are best for focused drills, lighter heat, and a calmer court.",
      accent: "from-amber-400/30",
    };
  }
  if (hour < 17) {
    return {
      Icon: Sun,
      period: "Afternoon",
      prompt: "Find your next lesson.",
      detail: "Compare coaches by area, price, and availability before the day gets crowded.",
      accent: "from-orange-400/26",
    };
  }
  return {
    Icon: Moon,
    period: "Evening",
    prompt: "Line up a calm evening lesson.",
    detail: "Book ahead, keep the court details clear, and arrive with the plan already settled.",
      accent: "from-[var(--lobb-clay)]/18",
  };
}

type HomeProfile = {
  role: "player" | "coach" | "admin";
  full_name: string | null;
  avatar_url: string | null;
};

export default function Home() {
  const router = useRouter();
  const [profile, setProfile]               = useState<HomeProfile | null>(null);
  // Must start true on both server and client to avoid hydration mismatch.
  // useEffect quickly sets it false for unauthenticated visitors so they never see the skeleton.
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [liveCoaches, setLiveCoaches]       = useState<CoachPublicProfile[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [coachQuery, setCoachQuery]         = useState("");
  const [coachLocation, setCoachLocation]   = useState("All");

  const locationChips = useMemo(() => {
    const locs = liveCoaches
      .flatMap((c) => [c.primary_location, ...c.service_areas])
      .filter(Boolean) as string[];
    return ["All", ...Array.from(new Set(locs)).slice(0, 5)];
  }, [liveCoaches]);

  const filteredCoaches = useMemo(() => {
    const q = coachQuery.trim().toLowerCase();
    return liveCoaches.filter((coach) => {
      const locMatch =
        coachLocation === "All" ||
        (coach.primary_location ?? "").toLowerCase().includes(coachLocation.toLowerCase()) ||
        coach.service_areas.some((a) => a.toLowerCase().includes(coachLocation.toLowerCase()));
      if (!locMatch) return false;
      if (!q) return true;
      return [
        coach.full_name, coach.headline ?? "", coach.primary_location ?? "",
        ...coach.service_areas, ...coach.specializations, ...coach.skill_levels,
      ].join(" ").toLowerCase().includes(q);
    });
  }, [coachLocation, coachQuery, liveCoaches]);

  useEffect(() => {
    // Skip the auth skeleton immediately for unauthenticated visitors.
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const ref = url.match(/https:\/\/([^.]+)\./)?.[1] ?? "";
      if (!ref || !localStorage.getItem(`sb-${ref}-auth-token`)) {
        setLoadingProfile(false);
      }
    } catch {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function handleUserId(userId: string) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;
        const p = data as HomeProfile | null;

        if (p?.role === "coach") { router.replace("/coach/dashboard"); return; }
        if (p?.role === "admin")  { router.replace("/admin"); return; }
        if (!p || (p.role === "player" && !p.full_name)) {
          router.replace("/auth/setup/player"); return;
        }
        setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        handleUserId(session.user.id);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
    });

    async function loadCoaches() {
      try {
        const { data } = await supabase
          .from("coach_profiles_public")
          .select("*")
          .eq("status", "active")
          .order("session_count", { ascending: false })
          .limit(6);
        if (!cancelled && data) setLiveCoaches(data as CoachPublicProfile[]);
      } finally {
        if (!cancelled) setLoadingCoaches(false);
      }
    }

    loadCoaches();
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [router]);

  /* ─────────────────────────── Loading skeleton ─────────────────────────── */
  if (loadingProfile) {
    return (
    <main className="lobb-app-page min-h-screen pb-28">
        <header className="lobb-app-header flex h-16 items-center justify-between border-b border-[var(--lobb-border-subtle)] px-5">
          <SkeletonBlock className="h-7 w-20 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </header>
        <div className="px-5 pt-4">
          <SkeletonBlock className="h-[220px] rounded-[var(--lobb-radius-lg)]" />
        </div>
        <section className="mt-10 px-5">
          <div className="mb-3 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SmallCoachCardSkeleton key={i} />)}
          </div>
        </section>
      </main>
    );
  }

  /* ──────────────────────── Authenticated player home ───────────────────── */
  if (profile?.role === "player" && profile.full_name) {
    const firstName = profile.full_name.split(" ")[0] || "there";
    const mood = getTimeMood();
    const MoodIcon = mood.Icon;
    return (
      <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
        <PlayerHeader active="home" title="Home" eyebrow="Player" />

        <section className="mx-auto max-w-6xl px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="lobb-hero-card relative overflow-hidden border px-6 py-6 sm:px-8 sm:py-7">
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.accent} via-transparent to-[var(--lobb-clay)]/8`} aria-hidden="true" />
            <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" aria-hidden="true" />
            <div className="relative">
              <div className="lobb-hero-eyebrow inline-flex max-w-full items-center gap-2 rounded-[var(--lobb-radius-md)] border px-3 py-2">
                <MoodIcon className="size-4 text-[var(--lobb-clay)]" />
                <span className="truncate text-[11px] font-medium uppercase tracking-[0.18em]">
                  {getGreeting()}, {firstName}
                </span>
              </div>
              <h1 className="mt-4 text-[28px] font-semibold leading-[1.08] tracking-tight sm:text-[38px] text-balance">
                {mood.prompt}
              </h1>
              <p className="lobb-hero-muted mt-2 max-w-lg text-[14px] font-normal leading-[1.6]">
                {mood.detail}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {liveCoaches.length > 0 && (
                  <span className="lobb-hero-muted text-[11px] font-medium uppercase tracking-[0.14em]">
                    {liveCoaches.length} coaches available
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-16 z-30 mt-4 border-y border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/88 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="flex h-12 items-center gap-3 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 shadow-[var(--lobb-shadow-card)] transition focus-within:border-[var(--lobb-clay)]/45">
                <Search className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                <LobbInput
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                  placeholder="Search by coach, area, skill"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
                />
              </label>
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] lg:max-w-[440px]">
                {locationChips.map((loc) => (
                  <LobbButton variant="unstyled"
                    key={loc}
                    onClick={() => setCoachLocation(loc)}
                    className={`h-10 shrink-0 rounded-[var(--lobb-radius-md)] px-4 text-[12px] font-medium transition duration-200 active:scale-[0.97] ${
                      coachLocation === loc
                        ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
                        : "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-text-primary)]"
                    }`}
                  >
                    {loc}
                  </LobbButton>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-7 max-w-6xl px-5 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                <MapPin className="size-3.5" />
                {coachLocation === "All" ? "Lagos" : coachLocation}
              </p>
              <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight">Recommended coaches</h2>
              <p className="mt-1 text-sm font-medium text-[var(--lobb-text-secondary)]">
                {!loadingCoaches && filteredCoaches.length > 0
                  ? `${filteredCoaches.length} ${filteredCoaches.length === 1 ? "coach" : "coaches"} ready to review`
                  : "Verified coaches, clear rates, real availability."}
              </p>
            </div>
            <Link href="/coaches" className="group hidden h-11 shrink-0 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-[12px] font-medium text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)] sm:inline-flex">
              See all
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loadingCoaches ? (
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => <SkeletonBlock key={i} className="h-[220px] rounded-[var(--lobb-radius-lg)]" />)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <SmallCoachCardSkeleton key={i} />)}
              </div>
            </div>
          ) : liveCoaches.length === 0 ? (
            <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-8 text-center">
              <p className="font-medium">Coaches are being verified</p>
              <p className="mt-1.5 text-sm text-[var(--lobb-text-secondary)]">We are onboarding Lagos coaches now. Check back soon.</p>
              <Link
                href="/auth/signup/coach"
                className="mt-5 inline-flex h-10 items-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)]"
              >
                Apply as a coach
              </Link>
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
              <p className="font-medium">No coaches match that search.</p>
              <p className="mt-1 text-sm text-[var(--lobb-text-secondary)]">Try another area or clear your filter.</p>
              <LobbButton variant="unstyled"
                onClick={() => { setCoachQuery(""); setCoachLocation("All"); }}
                className="mt-4 inline-flex h-10 items-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)]"
              >
                Clear search
              </LobbButton>
            </div>
          ) : (
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCoaches.map((coach) => <FeaturedCoachCard key={coach.id} coach={coach} />)}
              </div>
              <Link href="/coaches" className="mt-6 flex h-12 items-center justify-center rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-sm font-medium text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)] sm:hidden">
                See all coaches
              </Link>
            </div>
          )}
        </section>

        <PlayerBottomNav active="home" />
      </main>
    );
  }

  /* ──────────────────────── Unauthenticated splash ──────────────────────── */
  return <LandingSplash />;
}

function coachRate(value: number | null) {
  return value == null ? "Rate TBD" : `₦${value.toLocaleString("en-NG")}/hr`;
}

function FeaturedCoachCard({ coach }: { coach: CoachPublicProfile }) {
  const profileHref = `/coaches/${coach.slug ?? coach.id}`;
  const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : "#";
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis coach";
  const headline = coach.headline ?? `${primarySkill} near ${coach.primary_location ?? "Lagos"}`;
  const ratingLabel = coach.avg_rating != null ? Number(coach.avg_rating).toFixed(1) : "New";
  const locations = [coach.primary_location, ...coach.service_areas.filter((area) => area !== coach.primary_location)]
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

  return (
    <article className="group overflow-hidden rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--lobb-clay)]/35">
      <div className="grid min-h-[214px] grid-cols-[38%_minmax(0,1fr)]">
        <Link href={profileHref} className="relative block overflow-hidden bg-[var(--lobb-bg-secondary)]">
          <div className="absolute inset-0 flex items-center justify-center text-5xl font-semibold text-[var(--lobb-text-tertiary)]/35">
            {coach.full_name.charAt(0)}
          </div>
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_photo_url}
              alt={coach.full_name}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 size-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/58 to-transparent" />
          <span className="absolute bottom-3 left-3 rounded-[var(--lobb-radius-md)] bg-[#0d0d0d]/78 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur">
            {coachRate(coach.hourly_rate_ngn)}
          </span>
        </Link>

        <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                {primarySkill}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)] px-2 py-1 text-[11px] font-medium text-[var(--lobb-text-primary)]">
                <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                {ratingLabel}
              </span>
            </div>
            <Link href={profileHref} className="mt-3 block truncate text-xl font-semibold leading-tight tracking-tight transition hover:text-[var(--lobb-clay)]">
              {coach.full_name}
            </Link>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
              {headline}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[var(--lobb-text-tertiary)]">
              <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate">{locations || "Lagos"}</span>
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={bookingHref}
              aria-disabled={!coach.slug}
              className={`flex h-10 flex-1 items-center justify-center rounded-[var(--lobb-radius-md)] text-xs font-medium transition active:scale-[0.97] ${
                coach.slug
                  ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                  : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
              }`}
            >
              Book
            </Link>
            <Link href={profileHref} className="flex h-10 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-3 text-xs font-medium text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)]">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function LandingSplash() {
  const [coaches, setCoaches] = useState<CoachPublicProfile[]>([]);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("coach_profiles_public")
      .select("*")
      .eq("status", "active")
      .order("session_count", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!alive) return;
        if (data) setCoaches(data as CoachPublicProfile[]);
      });
    return () => { alive = false; };
  }, []);

  // Scroll reveals. Only elements still below the fold get hidden, so content
  // stays visible when JS or IntersectionObserver never runs. Re-runs when the
  // live coach sections render so their elements get bound too.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lobb-reveal-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    for (const el of els) {
      if (el.dataset.revealBound) {
        // Still hidden from a previous run: hand it to the new observer,
        // since the old one was disconnected by this effect's cleanup.
        if (el.classList.contains("lobb-reveal-pending") && !el.classList.contains("lobb-reveal-in")) {
          io.observe(el);
        }
        continue;
      }
      el.dataset.revealBound = "1";
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.classList.add("lobb-reveal-pending");
        io.observe(el);
      }
    }
    return () => io.disconnect();
  }, [coaches.length]);

  const heroCoach = coaches[0] ?? null;

  return (
    <main id="main-content" className="lobb-landing relative min-h-[100dvh] overflow-x-hidden bg-[var(--lobb-bg-primary)] text-[var(--lobb-bg-inverse)]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="lobb-landing-top-gradient absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(180deg,var(--lobb-bg-secondary),transparent)]" />
      </div>

      <header className="lobb-landing-header sticky top-0 z-30 border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/88 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 md:justify-self-start">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition duration-300 group-hover:border-[var(--lobb-clay)]/45">
              <LobbMark size={18} />
            </span>
            <span className="hidden text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--lobb-bg-inverse)] sm:inline">LOBB</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center justify-self-center gap-8 text-sm font-medium text-[var(--lobb-text-secondary)] md:flex">
            <Link href="/coaches" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">Coaches</Link>
            <Link href="/how-it-works" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">How it works</Link>
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">About</Link>
          </nav>

          <div className="flex shrink-0 items-center justify-self-end gap-1 sm:gap-2">
            <Link href="/auth/login" className="inline-flex h-10 items-center justify-center rounded-[var(--lobb-radius-lg)] px-3 text-sm font-medium text-[var(--lobb-text-secondary)] transition hover:text-[var(--lobb-bg-inverse)] sm:px-4">
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

          <h1 className="max-w-3xl text-[44px] font-semibold leading-[0.98] tracking-tight text-[var(--lobb-bg-inverse)] sm:text-[64px] lg:text-[76px] text-balance">
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
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.88] transition duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${courtImage})` }}
              aria-hidden="true"
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

      <section className="relative z-10 overflow-hidden bg-[#0d0d0d] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
        <div
          className="absolute inset-0 opacity-[0.16] mix-blend-screen"
          style={{ backgroundImage: `url(${courtImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
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
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">About</Link>
            <Link href="/faq" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">FAQ</Link>
            <Link href="/terms" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">Terms</Link>
            <Link href="/privacy" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">Privacy</Link>
            <Link href="/cancellation-policy" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">Cancellation</Link>
            <Link href="/contact" className="lobb-nav-link transition hover:text-[var(--lobb-bg-inverse)]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

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

function DotLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-2.5 text-[13px] font-medium ${light ? "text-white/75" : "text-[var(--lobb-text-secondary)]"}`}>
      <span className="size-1.5 shrink-0 bg-[var(--lobb-clay)]" aria-hidden="true" />
      {children}
    </p>
  );
}
