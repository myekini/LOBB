"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarCheck, CalendarDays, Check, ChevronDown, CreditCard, LogOut, MapPin, Moon, Search, Sun, Sunrise, User } from "lucide-react";
import { courtImage } from "@/lib/demo-content";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav, PlayerDesktopNav } from "@/components/layout/player-nav";
import { CoachListCard } from "@/features/coaches/coach-cards";
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

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

    const signOut = async () => {
      const supabase = createClient();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
      await supabase.auth.signOut();
      router.push("/auth/login");
    };

    return (
      <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">

        <header className="lobb-app-header sticky top-0 z-40 border-b border-[var(--lobb-border)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-2">
              <LobbMark size={20} />
              <span className="text-[13px] font-black tracking-tight text-[var(--lobb-black)]">LOBB</span>
            </div>
            <div className="flex items-center gap-3">
              <PlayerDesktopNav active="home" />
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Profile menu"
                  className="flex h-10 items-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] py-1 pl-1 pr-3 transition hover:border-[var(--lobb-clay)]/40"
                >
                  <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
                    {profile.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                      : <User className="size-4" />}
                  </span>
                  <span className="hidden max-w-[96px] truncate text-[12px] font-black md:block">{firstName}</span>
                  <ChevronDown className="size-3 text-[var(--lobb-muted)]" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2 shadow-[var(--lobb-shadow-modal)]">
                    <div className="flex items-center gap-3 border-b border-[var(--lobb-border)] p-3 pb-3">
                      <span className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-surface-2)]">
                        {profile.avatar_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                          : <User className="size-4 text-[var(--lobb-muted)]" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{profile.full_name}</p>
                        <p className="text-[11px] text-[var(--lobb-muted)]">Player account</p>
                      </div>
                    </div>
                    <ProfileMenuLink href="/dashboard" icon={<CalendarDays className="size-4" />} label="My bookings" />
                    <ProfileMenuLink href="/coaches"   icon={<Search className="size-4" />}      label="Browse coaches" />
                    <ProfileMenuLink href="/profile"   icon={<User className="size-4" />}        label="Profile settings" />
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-1 flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="relative overflow-hidden border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] px-6 py-6 text-[var(--lobb-text-inverse)] sm:px-8 sm:py-7">
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.accent} via-transparent to-[var(--lobb-clay)]/8`} aria-hidden="true" />
            <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" aria-hidden="true" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.06] px-3 py-2">
                <MoodIcon className="size-4 text-[var(--lobb-clay)]" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">{mood.period}</span>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--lobb-clay)]">
                {getGreeting()}, {firstName}
              </p>
              <h1 className="mt-2 text-[28px] font-black leading-[1.08] tracking-tight sm:text-[38px] text-balance">
                {mood.prompt}
              </h1>
              <p className="mt-2 max-w-lg text-[14px] font-normal leading-[1.6] text-white/52">
                {mood.detail}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {liveCoaches.length > 0 && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    {liveCoaches.length} coaches available
                  </span>
                )}
                <Link
                  href="/coaches"
                  className="inline-flex h-9 items-center gap-2 rounded-[12px] bg-[var(--lobb-clay)] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98]"
                >
                  Browse coaches <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="lobb-app-header sticky top-16 z-30 border-b border-[var(--lobb-border)] py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-5">
            <label className="lobb-app-card flex h-[50px] items-center gap-3 border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4">
              <Search className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <input
                value={coachQuery}
                onChange={(e) => setCoachQuery(e.target.value)}
                placeholder="Search coach, area, skill"
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </label>
            {locationChips.length > 1 && (
              <div className="-mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
                {locationChips.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setCoachLocation(loc)}
                    className={`h-9 shrink-0 rounded-[12px] px-4 text-[13px] font-black transition ${
                      coachLocation === loc
                        ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                        : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-6xl px-5 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-black tracking-tight">Book a verified coach</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--lobb-muted)]">
                <MapPin className="size-3 text-[var(--lobb-clay)]" />
                {coachLocation === "All" ? "Lagos areas" : coachLocation}
                {!loadingCoaches && filteredCoaches.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-[var(--lobb-clay-light)] px-2 py-0.5 text-[10px] font-black text-[var(--lobb-clay)]">
                    {filteredCoaches.length}
                  </span>
                )}
              </p>
            </div>
            <Link href="/coaches" className="shrink-0 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3.5 py-1.5 text-[12px] font-black text-[var(--lobb-black)] transition hover:border-[var(--lobb-clay)]/30 hover:text-[var(--lobb-clay)]">
              See all
            </Link>
          </div>

          {loadingCoaches ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => <SmallCoachCardSkeleton key={i} />)}
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCoaches.map((coach) => <CoachListCard key={coach.id} coach={coach} />)}
            </div>
          )}
        </section>

        <PlayerBottomNav active="home" />
      </main>
    );
  }

  /* ──────────────────────── Unauthenticated splash ──────────────────────── */
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] transition duration-300 group-hover:border-[var(--lobb-clay)]/45">
              <LobbMark size={18} />
            </span>
            <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[var(--lobb-black)]">LOBB</span>
          </Link>

          <nav className="hidden items-center gap-7 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)] md:flex">
            <Link href="/coaches" className="transition hover:text-[var(--lobb-black)]">Coaches</Link>
            <Link href="/how-it-works" className="transition hover:text-[var(--lobb-black)]">How it works</Link>
            <Link href="/about" className="transition hover:text-[var(--lobb-black)]">About</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link href="/auth/login" className="inline-flex h-10 items-center justify-center rounded-full px-3 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)] transition hover:text-[var(--lobb-black)] sm:px-4">
              Log in
            </Link>
            <ThemeToggle />
            <Link href="/auth/signup/player" className="inline-flex h-10 items-center justify-center rounded-[12px] bg-[var(--lobb-black)] px-4 text-[11px] font-black uppercase tracking-[0.12em] text-white transition duration-300 hover:bg-[var(--lobb-clay)] active:scale-[0.98] sm:px-5">
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
            Book the right court lesson.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-[1.7] text-[var(--lobb-muted)] sm:text-[18px] text-pretty">
            LOBB gives Lagos players a cleaner way to compare verified tennis coaches, reserve real session times, and pay before the first rally starts.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/coaches" className="group inline-flex h-14 items-center justify-center gap-2 bg-[var(--lobb-clay)] px-7 text-[12px] font-black uppercase tracking-[0.14em] text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98]">
              Find a coach
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/auth/signup/coach" className="inline-flex h-14 items-center justify-center border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-7 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-black)] transition duration-300 hover:border-[var(--lobb-clay)]/45 hover:text-[var(--lobb-clay)] active:scale-[0.98]">
              Join as a coach
            </Link>
          </div>

          <div className="mt-9 grid max-w-xl grid-cols-3 border-y border-[var(--lobb-border)]">
            {([
              ["36", "coach checks"],
              ["12", "Lagos areas"],
              ["3", "minute booking"],
            ] as const).map(([value, label]) => (
              <div key={label} className="border-r border-[var(--lobb-border)] px-3 py-4 first:pl-0 last:border-r-0 last:pr-0 sm:px-5">
                <p className="text-[28px] font-black tracking-tight text-[var(--lobb-black)] sm:text-[38px]">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-150">
          <div className="absolute -left-4 top-8 z-10 hidden border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)] lg:inline-flex">
            Lekki / Ikoyi / VI
          </div>
          <div className="lobb-hero-visual group relative min-h-[500px] overflow-hidden border border-white/15 bg-[#0d0d0d] sm:min-h-[540px]">
            <div
              className="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.88] transition duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${courtImage})` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,0.05),rgba(13,13,13,0.9)),linear-gradient(90deg,rgba(13,13,13,0.72),rgba(13,13,13,0.08)_48%,rgba(13,13,13,0.76)),radial-gradient(circle_at_78%_18%,rgba(196,98,45,0.34),transparent_28%)]" aria-hidden="true" />

            <div className="relative grid min-h-[500px] content-between gap-8 p-4 sm:min-h-[540px] sm:p-7">
              <div className="lobb-booking-widget ml-auto w-full max-w-[390px] p-4 sm:p-5">
                <div className="lobb-booking-head flex items-center justify-between pb-4">
                  <div>
                    <p className="lobb-booking-kicker text-[11px] font-black uppercase tracking-[0.16em]">Booking preview</p>
                    <p className="lobb-booking-title mt-1 text-lg font-black">Private lesson</p>
                  </div>
                  <span className="lobb-booking-icon flex size-10 items-center justify-center">
                    <CalendarDays className="size-5" />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="lobb-booking-tile p-3">
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Coach</p>
                    <p className="lobb-booking-value mt-1 text-sm font-black">Tunde A.</p>
                  </div>
                  <div className="lobb-booking-tile p-3">
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Time</p>
                    <p className="lobb-booking-value mt-1 text-sm font-black">7:30 AM</p>
                  </div>
                </div>
                <div className="lobb-booking-tile mt-2.5 flex items-center gap-2 p-3">
                  <MapPin className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                  <span className="lobb-booking-location text-sm font-semibold">Lagos Lawn Tennis Club</span>
                </div>
                <div className="lobb-booking-total mt-4 grid grid-cols-[1fr_auto] items-center gap-3 pt-4">
                  <div>
                    <p className="lobb-booking-label text-[10px] uppercase tracking-[0.14em]">Session total</p>
                    <p className="lobb-booking-price mt-1 text-2xl font-black">₦22,500</p>
                  </div>
                  <span className="lobb-booking-paymark px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]">
                    Paystack
                  </span>
                </div>
              </div>

              <div className="max-w-[430px] text-white">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/46">No vague arrangements</p>
                <h2 className="mt-3 text-[30px] font-black leading-[0.98] tracking-tight sm:text-[46px] text-balance">
                  Coach, court, time, payment in one clean flow.
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lobb-landing-band relative z-10 border-y border-[var(--lobb-border)] bg-[var(--lobb-surface)]/58 px-4 py-14 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">The booking loop</p>
            <h2 className="mt-4 max-w-md text-[32px] font-black leading-[1.02] tracking-tight sm:text-[46px] text-balance">
              Designed around how lessons actually happen.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--lobb-muted)]">
              One flow for the decision that matters: who teaches, where you play, when it happens, and how it gets confirmed.
            </p>
          </div>
          <div className="grid overflow-hidden border border-[var(--lobb-border)] md:grid-cols-3">
            {([
              [Search, "Compare", "Review profile, area, skill fit, and lesson focus before you message anyone."],
              [CalendarCheck, "Reserve", "Pick an open slot so the session has a clear time and place from the start."],
              [CreditCard, "Confirm", "Checkout keeps commitment clear for the player and the coach."],
            ] as const).map(([Icon, title, body], i) => (
              <div key={title} className="lobb-landing-panel border-b border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 lg:p-6">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-[var(--lobb-clay)]" />
                  <span className="text-[11px] font-black text-[var(--lobb-text-tertiary)]">0{i + 1}</span>
                </div>
                <p className="mt-8 text-xl font-black tracking-tight">{title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--lobb-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-8 lg:py-24">
        <div className="lobb-dark-panel border border-[var(--lobb-border)] bg-[#0d0d0d] p-6 text-white sm:p-8 lg:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">For players</p>
          <h2 className="mt-4 max-w-lg text-[32px] font-black leading-[1.02] tracking-tight sm:text-[46px] text-balance">
            Choose with enough context to feel confident.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Area", "Skill level", "Lesson focus", "Open times"].map((item) => (
              <div key={item} className="border border-white/[0.10] bg-white/[0.06] p-4">
                <p className="text-sm font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lobb-landing-panel border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] p-6 sm:p-8 lg:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">For coaches</p>
          <h2 className="mt-4 max-w-lg text-[32px] font-black leading-[1.02] tracking-tight sm:text-[46px] text-balance">
            A cleaner front desk for independent tennis coaches.
          </h2>
          <div className="mt-8 grid gap-3">
            {[
              "A public profile players can evaluate quickly.",
              "Service areas, skill levels, and session expectations in one place.",
              "Bookings that arrive with cleaner context and clearer commitment.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border-b border-[var(--lobb-border)] pb-3 last:border-b-0 last:pb-0">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                <p className="text-sm font-bold leading-6 text-[var(--lobb-black)]">{item}</p>
              </div>
            ))}
          </div>
          <Link href="/auth/signup/coach" className="group mt-8 inline-flex h-12 items-center justify-center gap-2 bg-[var(--lobb-black)] px-5 text-[12px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-inverse)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--lobb-clay)]">
            Apply as a coach
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
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
            <Link href="/about" className="transition hover:text-[var(--lobb-black)]">About</Link>
            <Link href="/faq" className="transition hover:text-[var(--lobb-black)]">FAQ</Link>
            <Link href="/terms" className="transition hover:text-[var(--lobb-black)]">Terms</Link>
            <Link href="/privacy" className="transition hover:text-[var(--lobb-black)]">Privacy</Link>
            <Link href="/contact" className="transition hover:text-[var(--lobb-black)]">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

function ProfileMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex h-10 items-center gap-3 rounded-[12px] px-3 text-[13px] font-black text-[var(--lobb-black)] transition hover:bg-[var(--lobb-surface)]">
      <span className="text-[var(--lobb-clay)]">{icon}</span>
      {label}
    </Link>
  );
}
