"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarDays, Check, MapPin, Moon, Search, Star, Sun, Sunrise } from "lucide-react";
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
    accent: "from-indigo-400/28",
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
        <header className="lobb-app-header flex h-16 items-center justify-between border-b border-[var(--lobb-border)] px-5">
          <SkeletonBlock className="h-7 w-20 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </header>
        <div className="px-5 pt-4">
          <SkeletonBlock className="h-[220px] rounded-[14px]" />
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
              <div className="lobb-hero-eyebrow inline-flex max-w-full items-center gap-2 rounded-[12px] border px-3 py-2">
                <MoodIcon className="size-4 text-[var(--lobb-clay)]" />
                <span className="truncate text-[11px] font-black uppercase tracking-[0.18em]">
                  {getGreeting()}, {firstName}
                </span>
              </div>
              <h1 className="mt-4 text-[28px] font-black leading-[1.08] tracking-tight sm:text-[38px] text-balance">
                {mood.prompt}
              </h1>
              <p className="lobb-hero-muted mt-2 max-w-lg text-[14px] font-normal leading-[1.6]">
                {mood.detail}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {liveCoaches.length > 0 && (
                  <span className="lobb-hero-muted text-[11px] font-semibold uppercase tracking-[0.14em]">
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
              <label className="flex h-12 items-center gap-3 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 shadow-[var(--lobb-shadow-card)] transition focus-within:border-[var(--lobb-clay)]/45">
                <Search className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                <input
                  value={coachQuery}
                  onChange={(e) => setCoachQuery(e.target.value)}
                  placeholder="Search by coach, area, skill"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
                />
              </label>
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] lg:max-w-[440px]">
                {locationChips.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setCoachLocation(loc)}
                    className={`h-10 shrink-0 rounded-[12px] px-4 text-[12px] font-black transition duration-200 active:scale-[0.97] ${
                      coachLocation === loc
                        ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
                        : "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-text-primary)]"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-7 max-w-6xl px-5 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                <MapPin className="size-3.5" />
                {coachLocation === "All" ? "Lagos" : coachLocation}
              </p>
              <h2 className="mt-1 text-[22px] font-black leading-tight tracking-tight">Recommended coaches</h2>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                {!loadingCoaches && filteredCoaches.length > 0
                  ? `${filteredCoaches.length} ${filteredCoaches.length === 1 ? "coach" : "coaches"} ready to review`
                  : "Verified coaches, clear rates, real availability."}
              </p>
            </div>
            <Link href="/coaches" className="group hidden h-11 shrink-0 items-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-[12px] font-black text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)] sm:inline-flex">
              See all
              <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loadingCoaches ? (
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => <SkeletonBlock key={i} className="h-[220px] rounded-[16px]" />)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <SmallCoachCardSkeleton key={i} />)}
              </div>
            </div>
          ) : liveCoaches.length === 0 ? (
            <div className="lobb-app-card border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center">
              <p className="font-black">Coaches are being verified</p>
              <p className="mt-1.5 text-sm text-[var(--lobb-muted)]">We are onboarding Lagos coaches now. Check back soon.</p>
              <Link
                href="/auth/signup/coach"
                className="mt-5 inline-flex h-10 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-black text-[var(--lobb-text-inverse)]"
              >
                Apply as a coach
              </Link>
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="lobb-app-card border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5">
              <p className="font-black">No coaches match that search.</p>
              <p className="mt-1 text-sm text-[var(--lobb-muted)]">Try another area or clear your filter.</p>
              <button
                onClick={() => { setCoachQuery(""); setCoachLocation("All"); }}
                className="mt-4 inline-flex h-10 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-black text-[var(--lobb-text-inverse)]"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredCoaches.map((coach) => <FeaturedCoachCard key={coach.id} coach={coach} />)}
              </div>
              <Link href="/coaches" className="mt-6 flex h-12 items-center justify-center rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-sm font-black text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)] sm:hidden">
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

// Plays the booking lifecycle in the hero widget's status line: slot hold
// counting down, payment secured, then confirmed. Under reduced motion (or
// before hydration) it stays on the confirmed state.
function BookingLifecycle() {
  const [phase, setPhase] = useState<"hold" | "paid" | "confirmed">("confirmed");
  const [secondsLeft, setSecondsLeft] = useState(582);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 6; // start mid-cycle so the confirmed state shows first
    const id = window.setInterval(() => {
      t = (t + 1) % 12;
      if (t < 5) {
        setPhase("hold");
        setSecondsLeft(582 - t);
      } else if (t < 7) {
        setPhase("paid");
      } else {
        setPhase("confirmed");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const label =
    phase === "hold"
      ? `Slot held · ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
      : phase === "paid"
        ? "Payment secured"
        : "Confirmed session";

  const dot =
    phase === "hold"
      ? "bg-[var(--lobb-warning)]"
      : phase === "paid"
        ? "bg-[var(--lobb-clay)]"
        : "lobb-dot-pulse bg-[var(--lobb-success)]";

  return (
    <p key={phase} className="lobb-booking-kicker flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="tabular-nums">{label}</span>
    </p>
  );
}

function shortCoachName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "Coach";
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

const LANDING_BASE_AREAS = [
  "Lekki", "Ikoyi", "Victoria Island", "Ikeja", "Surulere", "Yaba",
  "Lagos Island", "Ajah", "Gbagada", "Magodo", "Onikan", "National Stadium",
];

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
    <article className="group overflow-hidden rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--lobb-clay)]/35">
      <div className="grid min-h-[214px] grid-cols-[38%_minmax(0,1fr)]">
        <Link href={profileHref} className="relative block overflow-hidden bg-[var(--lobb-bg-secondary)]">
          <div className="absolute inset-0 flex items-center justify-center text-5xl font-black text-[var(--lobb-text-tertiary)]/35">
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
          <span className="absolute bottom-3 left-3 rounded-[10px] bg-[#0d0d0d]/78 px-2.5 py-1.5 text-[11px] font-black text-white backdrop-blur">
            {coachRate(coach.hourly_rate_ngn)}
          </span>
        </Link>

        <div className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                {primarySkill}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-[var(--lobb-bg-secondary)] px-2 py-1 text-[11px] font-black text-[var(--lobb-text-primary)]">
                <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                {ratingLabel}
              </span>
            </div>
            <Link href={profileHref} className="mt-3 block truncate text-xl font-black leading-tight tracking-tight transition hover:text-[var(--lobb-clay)]">
              {coach.full_name}
            </Link>
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
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
              className={`flex h-10 flex-1 items-center justify-center rounded-[12px] text-xs font-black transition active:scale-[0.97] ${
                coach.slug
                  ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                  : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
              }`}
            >
              Book
            </Link>
            <Link href={profileHref} className="flex h-10 items-center justify-center rounded-[12px] border border-[var(--lobb-border-subtle)] px-3 text-xs font-black text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-clay)]">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function LandingSplash() {
  const visualRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [coaches, setCoaches] = useState<CoachPublicProfile[]>([]);
  const [coachCount, setCoachCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("coach_profiles_public")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order("session_count", { ascending: false })
      .limit(8)
      .then(({ data, count }) => {
        if (!alive) return;
        if (data) setCoaches(data as CoachPublicProfile[]);
        if (count != null) setCoachCount(count);
      });
    return () => { alive = false; };
  }, []);

  const areas = useMemo(() => {
    const fromCoaches = coaches
      .flatMap((c) => [c.primary_location, ...c.service_areas])
      .filter(Boolean) as string[];
    return Array.from(new Set([...fromCoaches, ...LANDING_BASE_AREAS]));
  }, [coaches]);

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

  // Pointer tilt on the booking preview card, desktop pointers only.
  useEffect(() => {
    const visual = visualRef.current;
    const widget = widgetRef.current;
    if (!visual || !widget) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      const rect = visual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        widget.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-2px)`;
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      widget.style.transform = "";
    };
    visual.addEventListener("mousemove", onMove);
    visual.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      visual.removeEventListener("mousemove", onMove);
      visual.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Hero booking widget mirrors the top live coach; static fallback until data lands.
  const heroCoach = coaches[0] ?? null;
  const heroCoachName = heroCoach ? shortCoachName(heroCoach.full_name) : "Tunde A.";
  const heroCourt = heroCoach?.primary_location ?? "Lagos Lawn Tennis Club";
  const heroTotal = heroCoach?.hourly_rate_ngn != null ? Math.round(heroCoach.hourly_rate_ngn * 1.05) : 22500;

  return (
    <main className="lobb-landing relative min-h-[100dvh] overflow-x-hidden bg-[var(--lobb-bg)] text-[var(--lobb-black)]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="lobb-landing-top-gradient absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(180deg,var(--lobb-bg-secondary),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--lobb-black)_4%,transparent)_1px,transparent_1px),linear-gradient(0deg,color-mix(in_srgb,var(--lobb-black)_3%,transparent)_1px,transparent_1px)] bg-[length:88px_88px]" />
        <div
          className="lobb-landing-court-texture absolute inset-x-0 top-0 h-[720px] opacity-[0.09] mix-blend-multiply"
          style={{ backgroundImage: `url(${courtImage})`, backgroundSize: "cover", backgroundPosition: "center top" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--lobb-bg)_38%,transparent),var(--lobb-bg)_710px),linear-gradient(90deg,var(--lobb-bg)_0%,color-mix(in_srgb,var(--lobb-bg)_54%,transparent)_48%,var(--lobb-bg)_100%)]" />
      </div>

      <header className="lobb-landing-header sticky top-0 z-30 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/78 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 md:justify-self-start">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] transition duration-300 group-hover:border-[var(--lobb-clay)]/45">
              <LobbMark size={18} />
            </span>
            <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[var(--lobb-black)]">LOBB</span>
          </Link>

          <nav className="hidden items-center gap-7 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)] md:flex md:justify-self-center">
            <Link href="/coaches" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">Coaches</Link>
            <Link href="/how-it-works" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">How it works</Link>
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">About</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:justify-self-end">
            <Link href="/auth/login" className="inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)] transition hover:text-[var(--lobb-black)] sm:px-4">
              Log in
            </Link>
            <ThemeToggle />
            <Link href="/auth/signup/player" className="lobb-cta-sheen inline-flex h-10 items-center justify-center rounded-[12px] bg-[var(--lobb-black)] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white transition duration-300 hover:bg-[var(--lobb-clay)] active:scale-[0.98] sm:px-5">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-8 lg:py-12">
        <div className="max-w-3xl animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          <div className="mb-5 inline-flex items-center gap-2 border border-[var(--lobb-border)] bg-[var(--lobb-surface)]/88 px-3.5 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--lobb-clay)] opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--lobb-clay)]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">
              Verified tennis coaching across Lagos
            </span>
          </div>

          <h1 className="max-w-3xl text-[44px] font-black leading-[0.96] tracking-tight text-[var(--lobb-black)] sm:text-[68px] lg:text-[88px] text-balance">
            Book a coach. Not a favor.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-[1.7] text-[var(--lobb-muted)] sm:text-[18px] text-pretty">
            Lagos&apos;s verified tennis coaches. Available now. No WhatsApp required.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/coaches" className="lobb-cta-sheen group inline-flex h-14 items-center justify-center gap-2 rounded-[8px] bg-[var(--lobb-clay)] px-7 text-[12px] font-black uppercase tracking-[0.14em] text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98]">
              Find a coach
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/auth/signup/coach" className="inline-flex h-14 items-center justify-center rounded-[8px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-7 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-black)] transition duration-300 hover:border-[var(--lobb-clay)]/45 hover:text-[var(--lobb-clay)] active:scale-[0.98]">
              Join as a coach
            </Link>
          </div>

          <div className={`mt-9 grid max-w-xl border-y border-[var(--lobb-border)] ${coachCount != null ? "grid-cols-3" : "grid-cols-2"}`}>
            {([
              ...(coachCount != null ? [[coachCount, "verified Lagos coaches"]] : []),
              [areas.length, "Lagos areas"],
              [10, "minute slot hold"],
            ] as [number, string][]).map(([value, label]) => (
              <div key={label} className="border-r border-[var(--lobb-border)] px-3 py-4 first:pl-0 last:border-r-0 last:pr-0 sm:px-5">
                <p className="text-[36px] font-black tabular-nums tracking-tight text-[var(--lobb-black)] sm:text-[52px]"><StatValue value={value} /></p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-150">
          <div ref={visualRef} className="lobb-hero-visual group relative min-h-[500px] overflow-hidden border border-white/15 bg-[#0d0d0d] sm:min-h-[540px]">
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.88] transition duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${courtImage})` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.05),rgba(13,13,13,0.9)),linear-gradient(90deg,rgba(13,13,13,0.72),rgba(13,13,13,0.08)_48%,rgba(13,13,13,0.76)),radial-gradient(circle_at_78%_18%,rgba(196,98,45,0.34),transparent_28%)]" aria-hidden="true" />

            <div className="relative grid min-h-[500px] content-between gap-8 p-4 sm:min-h-[540px] sm:p-7">
              <div ref={widgetRef} className="lobb-booking-widget ml-auto w-full max-w-[390px] p-4 sm:p-5">
                <div className="lobb-booking-head flex items-center justify-between pb-4">
                  <div>
                    <BookingLifecycle />
                    <p className="lobb-booking-title mt-1 text-lg font-black">Private lesson</p>
                  </div>
                  <span className="lobb-booking-icon flex size-10 items-center justify-center">
                    <CalendarDays className="size-5" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="lobb-booking-tile p-3">
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Coach</p>
                    <p className="lobb-booking-value mt-1 truncate text-sm font-black">{heroCoachName}</p>
                  </div>
                  <div className="lobb-booking-tile p-3">
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Time</p>
                    <p className="lobb-booking-value mt-1 text-sm font-black">7:30 AM</p>
                  </div>
                </div>
                <div className="lobb-booking-tile mt-2.5 flex items-center gap-2 p-3">
                  <MapPin className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                  <span className="lobb-booking-location truncate text-sm font-semibold">{heroCourt}</span>
                </div>
                <div className="lobb-booking-total mt-4 grid grid-cols-[1fr_auto] items-center gap-3 pt-4">
                  <div>
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Session total</p>
                    <p className="lobb-booking-price mt-1 text-2xl font-black">₦{heroTotal.toLocaleString("en-NG")}</p>
                  </div>
                  <span className="lobb-booking-paymark px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]">
                    Paystack
                  </span>
                </div>
              </div>

              <div className="max-w-[430px] text-white">
                <h2 className="text-[30px] font-black leading-[0.98] tracking-tight sm:text-[46px] text-balance">
                  Coach, court, time, payment in one clean flow.
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {coaches.length > 0 && (
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-4 pt-14 sm:px-6 lg:px-8">
          <div data-reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <DotLabel>Coaches on LOBB</DotLabel>
              <h2 className="mt-3 text-[28px] font-black leading-[1.04] tracking-tight sm:text-[38px] text-balance">
                Real coaches, real rates.
              </h2>
            </div>
            <Link href="/coaches" className="group inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[var(--lobb-black)] transition hover:text-[var(--lobb-clay)]">
              See all coaches <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="lobb-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:none]">
            {coaches.map((coach, i) => (
              <LandingCoachCard key={coach.id} coach={coach} index={i} />
            ))}
          </div>
        </section>
      )}

      <div className="lobb-marquee relative z-10 mt-10 border-y border-[var(--lobb-border)] bg-[var(--lobb-surface)]/58 py-3.5" aria-hidden="true">
        <div className="lobb-marquee-track">
          {[...areas, ...areas].map((area, i) => (
            <span key={`${area}-${i}`} className="flex shrink-0 items-center gap-5 pr-5 text-[12px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
              {area}
              <span className="size-1.5 rounded-full bg-[var(--lobb-clay)]" />
            </span>
          ))}
        </div>
      </div>

      <section className="relative z-10 bg-[var(--lobb-black)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="mb-14">
            <DotLabel light>How booking works</DotLabel>
            <h2 className="mt-3 max-w-lg text-[32px] font-black leading-[1.02] tracking-tight text-white sm:text-[44px] text-balance">
              Three steps.<br />On court by morning.
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-3 md:gap-14">
            {([
              ["01", "Find your coach", "Browse verified coaches by area, skill level, and available time slots. Rates shown upfront — no back-and-forth."],
              ["02", "Hold your slot", "Reserve your session with a 10-minute hold while you complete the booking. Nobody can take it mid-payment."],
              ["03", "Pay once, play", "LOBB holds the coach's payout until after your session, then releases it automatically. Every incentive points at the court."],
            ] as const).map(([num, title, body], i) => (
              <div
                key={num}
                data-reveal
                style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
                className="border-t border-white/[0.08] pt-7"
              >
                <p className="mb-5 text-[44px] font-black leading-none tracking-tight text-[var(--lobb-clay)] sm:text-[52px]">{num}</p>
                <p className="text-[18px] font-black leading-tight tracking-tight text-white">{title}</p>
                <p className="mt-3 text-[14px] leading-[1.65] text-white/50">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8 lg:pb-24">
        <div data-reveal className="lobb-dark-panel border border-[var(--lobb-border)] bg-[#0d0d0d] p-6 text-white sm:p-8 lg:p-10">
          <DotLabel light>For players</DotLabel>
          <h2 className="mt-3 max-w-lg text-[32px] font-black leading-[1.02] tracking-tight sm:text-[44px] text-balance">
            Choose with enough context to feel confident.
          </h2>
          <div className="mt-8 border border-white/[0.10] bg-white/[0.05] p-4 sm:p-5">
            <div className="flex h-11 items-center gap-3 border border-white/[0.12] bg-white/[0.07] px-4">
              <Search className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate text-sm font-semibold text-white/75">Lekki, intermediate, backhand</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Lekki", "Intermediate", "Morning slots"].map((chip) => (
                <span key={chip} className="border border-[var(--lobb-clay)]/45 bg-[var(--lobb-clay)]/15 px-3 py-1.5 text-[11px] font-black text-[#e8a075]">
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 border border-white/[0.10] bg-white/[0.06] p-3">
              {coaches[0]?.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coaches[0].profile_photo_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-[var(--lobb-clay)]">
                  {(coaches[0]?.full_name ?? "Tunde A.").charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{coaches[0]?.full_name ?? "Tunde A."}</p>
                <p className="truncate text-xs font-semibold text-white/75">{coaches[0]?.primary_location ?? "Lagos Lawn Tennis Club"}</p>
              </div>
              {(coaches[0]?.hourly_rate_ngn ?? 20000) > 0 && (
                <span className="shrink-0 text-sm font-black text-white">₦{(coaches[0]?.hourly_rate_ngn ?? 20000).toLocaleString("en-NG")}<span className="text-[10px] font-bold text-white/75">/hr</span></span>
              )}
            </div>
          </div>
        </div>

        <div data-reveal style={{ "--reveal-delay": "100ms" } as React.CSSProperties} className="lobb-landing-panel border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] p-6 sm:p-8 lg:p-10">
          <DotLabel>For coaches</DotLabel>
          <h2 className="mt-3 max-w-lg text-[32px] font-black leading-[1.02] tracking-tight sm:text-[44px] text-balance">
            A cleaner front desk for independent tennis coaches.
          </h2>
          <div className="mt-8 grid gap-3">
            {[
              "A public profile players can evaluate quickly.",
              "Service areas, skill levels, and session expectations in one place.",
              "Bookings arrive pre-paid, with your payout released automatically after the session.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border-b border-[var(--lobb-border)] pb-3 last:border-b-0 last:pb-0">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                <p className="text-sm font-bold leading-6 text-[var(--lobb-black)]">{item}</p>
              </div>
            ))}
          </div>
          <Link href="/auth/signup/coach" className="lobb-cta-sheen group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[var(--lobb-black)] px-5 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-inverse)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--lobb-clay)]">
            Apply as a coach
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="lobb-landing-band relative z-10 border-y border-[var(--lobb-border)] bg-[var(--lobb-surface)]/58 px-4 py-12 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl md:grid-cols-2">
          {([
            ["The price is the price", "The coach's hourly rate plus a 5% convenience fee, shown in full before you pay."],
            ["Plans change, fine", "Cancel at least 24 hours ahead for a full refund. Cancel within 24 hours and you get 50% back."],
          ] as const).map(([title, body], i) => (
            <div
              key={title}
              data-reveal
              style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}
              className="border-b border-[var(--lobb-border)] py-6 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:py-2 md:first:pl-0 md:last:border-r-0"
            >
              <p className="text-lg font-black tracking-tight">{title}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--lobb-muted)]">{body}</p>
            </div>
          ))}
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
          <h2 className="text-[40px] font-black leading-[0.98] tracking-tight sm:text-[60px] text-balance">
            Your next lesson, on the calendar.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.7] text-white/75">
            Pick a coach, hold a slot, pay once. The rest happens on court.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/coaches" className="lobb-cta-sheen group inline-flex h-14 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--lobb-clay)] px-8 text-[12px] font-black uppercase tracking-[0.14em] text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98] sm:w-auto">
              Find a coach
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/auth/signup/coach" className="inline-flex h-14 w-full items-center justify-center rounded-[8px] border border-white/20 px-8 text-[12px] font-black uppercase tracking-[0.14em] text-white transition duration-300 hover:border-white/55 active:scale-[0.98] sm:w-auto">
              Join as a coach
            </Link>
          </div>
        </div>
      </section>

      <footer className="lobb-landing-header relative z-10 border-t border-[var(--lobb-border)] bg-[var(--lobb-bg)]/88 px-4 py-7 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <LobbMark size={18} />
            <span className="text-[12px] font-black uppercase tracking-[0.18em]">LOBB</span>
            <span className="text-[12px] font-semibold text-[var(--lobb-muted)]">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">
            <Link href="/about" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">About</Link>
            <Link href="/faq" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">FAQ</Link>
            <Link href="/terms" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">Terms</Link>
            <Link href="/privacy" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">Privacy</Link>
            <Link href="/cancellation-policy" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">Cancellation</Link>
            <Link href="/contact" className="lobb-nav-link transition hover:text-[var(--lobb-black)]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

function DotLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`flex items-center gap-2.5 text-[13px] font-black ${light ? "text-white/75" : "text-[var(--lobb-muted)]"}`}>
      <span className="size-1.5 shrink-0 bg-[var(--lobb-clay)]" aria-hidden="true" />
      {children}
    </p>
  );
}

function LandingCoachCard({ coach, index }: { coach: CoachPublicProfile; index: number }) {
  const href = `/coaches/${coach.slug ?? coach.id}`;
  return (
    <Link
      href={href}
      data-reveal
      style={{ "--reveal-delay": `${Math.min(index, 6) * 70}ms` } as React.CSSProperties}
      className="group/coach w-[240px] shrink-0 snap-start overflow-hidden rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[var(--lobb-clay)]/40 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)]"
    >
      <div className="relative h-[176px] overflow-hidden bg-[var(--lobb-bg-secondary)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.profile_photo_url}
            alt={coach.full_name}
            className="size-full object-cover transition-transform duration-500 group-hover/coach:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[44px] font-black text-[var(--lobb-text-tertiary)]/35">
            {coach.full_name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
        {coach.hourly_rate_ngn != null && (
          <span className="absolute bottom-2.5 left-2.5 rounded-[6px] bg-[#0d0d0d]/82 px-2.5 py-1.5 text-[11px] font-black text-white backdrop-blur">
            ₦{coach.hourly_rate_ngn.toLocaleString("en-NG")}<span className="font-bold text-white/75">/hr</span>
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-black">{coach.full_name}</p>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--lobb-clay)]/10 px-2 py-0.5 text-[10px] font-black text-[var(--lobb-clay)]">
            <Star className="size-2.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            {coach.avg_rating ?? "New"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-[var(--lobb-muted)]">{coach.headline ?? "Tennis coach"}</p>
        {coach.primary_location && (
          <p className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--lobb-text-secondary)]">
            <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{coach.primary_location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

function StatValue({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1100;
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 4);
          setDisplay(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        setDisplay(0);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}
