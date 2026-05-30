"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarDays, ChevronDown, LogOut, MapPin, Moon, Search, Sun, Sunrise, User, Check } from "lucide-react";
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
      prompt: "Set up a clean morning hit.",
      detail: "Early sessions are best for focused drills, lighter heat, and a calmer court.",
      accent: "from-[#f7c56b]/18",
    };
  }
  if (hour < 17) {
    return {
      Icon: Sun,
      period: "Afternoon",
      prompt: "Find your next focused lesson.",
      detail: "Compare coaches by area, price, and availability before the day gets crowded.",
      accent: "from-[#d8a557]/16",
    };
  }
  return {
    Icon: Moon,
    period: "Evening",
    prompt: "Line up a calm evening lesson.",
    detail: "Book ahead, keep the court details clear, and arrive with the plan already settled.",
    accent: "from-[#7b8fc7]/18",
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

  // States for interactive landing page preview widget
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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
      <main className="min-h-screen bg-[var(--lobb-bg)] pb-28">
        <header className="flex h-16 items-center justify-between border-b border-[var(--lobb-border)] px-5">
          <SkeletonBlock className="h-7 w-20 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </header>
        <div className="px-5 pt-4">
          <SkeletonBlock className="h-[220px] rounded-[24px]" />
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
      <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">

        {/* ── App header ── */}
        <header className="sticky top-0 z-40 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 backdrop-blur-xl">
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
                  className="flex h-10 items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] py-1 pl-1 pr-3 transition hover:border-[var(--lobb-clay)]/40"
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
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[20px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2 shadow-[var(--lobb-shadow-modal)]">
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

        {/* ── Mood hero card ── */}
        <section className="mx-auto max-w-6xl px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="relative overflow-hidden rounded-[24px] bg-[#0d0d0d] px-6 py-6 text-white shadow-[0_16px_40px_rgba(13,13,13,0.16)] sm:px-8 sm:py-7">
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
              <h1 className="mt-2 text-[28px] font-black leading-[1.08] tracking-tight sm:text-[38px]">
                {mood.prompt}
              </h1>
              <p className="mt-2 max-w-lg text-[14px] font-normal leading-[1.6] text-white/52">
                {mood.detail}
              </p>
              {liveCoaches.length > 0 && (
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/36">
                  {liveCoaches.length} verified coaches available
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Sticky search ── */}
        <section className="sticky top-16 z-30 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-5">
            <label className="flex h-[50px] items-center gap-3 rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 shadow-[0_8px_24px_rgba(58,43,20,0.05)]">
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
                    className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-black transition ${
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

        {/* ── Coach list ── */}
        <section className="mx-auto mt-5 max-w-6xl px-5 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-black">Book a verified coach</h2>
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--lobb-muted)]">
                <MapPin className="size-3 text-[var(--lobb-clay)]" />
                {coachLocation === "All" ? "Lagos areas" : coachLocation}
              </p>
            </div>
            <Link href="/coaches" className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3.5 py-1.5 text-[12px] font-black text-[var(--lobb-black)] transition hover:border-[var(--lobb-clay)]/30">
              See all
            </Link>
          </div>

          {loadingCoaches ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => <SmallCoachCardSkeleton key={i} />)}
            </div>
          ) : liveCoaches.length === 0 ? (
            <div className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center">
              <p className="font-black">Coaches are being verified</p>
              <p className="mt-1.5 text-sm text-[var(--lobb-muted)]">We&apos;re onboarding Lagos coaches now — check back soon.</p>
              <Link
                href="/auth/signup/coach"
                className="mt-5 inline-flex h-10 items-center rounded-full bg-[var(--lobb-bg-inverse)] px-5 text-sm font-black text-[var(--lobb-text-inverse)]"
              >
                Apply as a coach
              </Link>
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5">
              <p className="font-black">No coaches match that search.</p>
              <p className="mt-1 text-sm text-[var(--lobb-muted)]">Try another area or clear your filter.</p>
              <button
                onClick={() => { setCoachQuery(""); setCoachLocation("All"); }}
                className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--lobb-bg-inverse)] px-5 text-sm font-black text-[var(--lobb-text-inverse)]"
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
  const coachCount = liveCoaches.length;
  const coachesReady = !loadingCoaches;

  return (
    <main className="lobb-landing relative min-h-[100dvh] bg-[var(--lobb-bg)] text-[var(--lobb-black)] flex flex-col overflow-hidden font-sans">
      
      {/* Background Canvas: Premium Glowing Spotlight & Grid Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="lobb-landing-top-gradient absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(180deg,#fffaf2,rgba(250,248,245,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(196,98,45,0.12),transparent_30%),radial-gradient(circle_at_90%_12%,rgba(45,106,79,0.08),transparent_28%)]" />
        <div
          className="lobb-landing-court-texture absolute inset-0 opacity-[0.035] mix-blend-multiply pointer-events-none filter blur-[1px]"
          style={{ backgroundImage: `url(${courtImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--lobb-bg)]" />
      </div>

      {/* Header */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/85 px-5 backdrop-blur-md sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] transition-all duration-300 group-hover:border-[var(--lobb-clay)]/40">
            <LobbMark size={16} />
          </span>
          <span className="text-[13px] font-black tracking-[0.16em] uppercase text-[var(--lobb-black)]">LOBB</span>
        </Link>
        <nav />
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link href="/auth/login" className="hidden sm:inline-flex h-9 items-center px-4 text-xs font-bold uppercase tracking-widest text-[var(--lobb-muted)] transition-colors hover:text-[var(--lobb-black)]">
            Log in
          </Link>
          <ThemeToggle />
          <Link href="/auth/signup/player" className="flex h-9 shrink-0 items-center justify-center rounded-full bg-[var(--lobb-black)] px-4 text-xs font-black uppercase tracking-widest text-white transition-all duration-300 hover:bg-[var(--lobb-clay)] active:scale-[0.97] sm:px-5">
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[calc(100dvh-108px)] lg:px-12 lg:py-8">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex select-none flex-col text-left lg:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3.5 py-1.5 self-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D96B27] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D96B27]"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
                Lagos Tennis
              </span>
            </div>
            <h1 className="text-[38px] sm:text-[52px] lg:text-[66px] font-black leading-[1.06] text-[var(--lobb-black)] animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-75">
              Precision Coaching.<br />
              <span className="text-[var(--lobb-clay)]">Perfect Timing.</span>
            </h1>
            <p className="mt-5 max-w-[480px] text-[14px] sm:text-[16px] leading-[1.7] text-[var(--lobb-muted)] animate-in fade-in-0 duration-700 delay-150">
              Find certified tennis coaches across Lagos — Lekki, Ikoyi, VI, and beyond. Browse real profiles, check live availability, book your session, and pay securely through Paystack.
            </p>
            <div className="mt-8 flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 sm:flex-row sm:flex-wrap">
              <Link href="/coaches" className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#D96B27] to-[#C4622D] px-6 text-center text-xs font-bold uppercase tracking-widest text-white shadow-[0_8px_32px_rgba(217,107,39,0.25)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(217,107,39,0.4)] hover:-translate-y-0.5 active:scale-[0.98] sm:px-8">
                <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                Browse coaches
                <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/auth/signup/coach" className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-6 text-center text-xs font-bold uppercase tracking-widest text-[var(--lobb-black)] transition-all duration-300 hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)] active:scale-[0.98] sm:px-8">
                Become a coach
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 animate-in fade-in-0 duration-500 delay-250">
              {["Verified coaches", "Instant booking", "All of Lagos"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--lobb-muted)]">
                  <Check className="size-3 shrink-0 text-[#D96B27]" />
                  {f}
                </div>
              ))}
            </div>

            {coachesReady && coachCount > 0 && (
              <div className="mt-7 flex items-center gap-3 animate-in fade-in-0 duration-500 delay-300">
                <div className="flex -space-x-2.5 overflow-hidden">
                  {liveCoaches.slice(0, 4).map((coach) => (
                    <Link
                      key={coach.id}
                      href={`/coaches/${coach.slug ?? coach.id}`}
                      className="inline-block size-8 rounded-full border-2 border-[var(--lobb-bg)] bg-[var(--lobb-surface)] overflow-hidden transition-transform duration-300 hover:scale-110 relative"
                      title={coach.full_name}
                    >
                      {coach.profile_photo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
                        : <span className="size-full bg-white/[0.08] block" />}
                    </Link>
                  ))}
                </div>
                <div className="text-[11px] font-semibold text-[var(--lobb-muted)] flex items-center gap-1.5">
                  <Link href="/coaches" className="text-[var(--lobb-black)] hover:text-[#D96B27] transition-colors font-bold">
                    {coachCount} verified coaches
                  </Link>{" "}
                  on LOBB
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center lg:col-span-5 lg:justify-end">
            <div className="lobb-booking-widget group relative w-full max-w-[420px] select-none overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in fade-in-0 duration-700 delay-200 sm:p-6">
              <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#D96B27]/10 rounded-full filter blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1566753323558-f4e0952af115?auto=format&fit=crop&q=80&w=200&h=200" alt="Coach Tunde" className="size-full object-cover" />
                    </span>
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#050505]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide flex items-center">
                      Coach Tunde O.
                    </h3>
                    <p className="text-[10px] text-white/40 font-medium mt-0.5">Ikoyi Tennis Club · Head Pro</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white tracking-wide">₦25k</p>
                  <p className="text-[8px] text-white/30 font-semibold uppercase tracking-wider mt-0.5">per hour</p>
                </div>
              </div>
              {!bookingSuccess ? (
                <div className="mt-5 flex flex-col gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-2.5">Schedule Today</p>
                    <div className="grid grid-cols-4 gap-2 border-b border-white/[0.04] pb-4 mb-1">
                      {[
                        { day: "Mon", date: "25" },
                        { day: "Tue", date: "26", active: true },
                        { day: "Wed", date: "27" },
                        { day: "Thu", date: "28" }
                      ].map((item) => (
                        <div 
                          key={item.date} 
                          className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                            item.active 
                              ? "border-[#D96B27]/40 bg-[#D96B27]/5 text-white" 
                              : "border-white/[0.04] bg-white/[0.01] text-white/30"
                          }`}
                        >
                          <span className="text-[8px] font-bold uppercase tracking-widest">{item.day}</span>
                          <span className={`text-xs font-bold mt-0.5 ${item.active ? "text-[#D96B27]" : "text-white/70"}`}>{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/35 mb-2">Available Slots</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.02] py-2.5 text-[11px] font-semibold text-white/18 line-through cursor-not-allowed select-none">
                        08:00 AM - 09:30 AM
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (!isBooking) setSelectedSlot(selectedSlot === "10:30 AM" ? null : "10:30 AM"); }}
                        className={`w-full py-2.5 rounded-xl border text-[11px] font-semibold transition-all duration-300 ${
                          selectedSlot === "10:30 AM"
                            ? "border-[#D96B27] bg-[#D96B27]/10 text-white shadow-[0_0_20px_rgba(217,107,39,0.15)]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] text-white/80"
                        }`}
                      >
                        10:30 AM - 12:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isBooking) setSelectedSlot(selectedSlot === "04:30 PM" ? null : "04:30 PM"); }}
                        className={`w-full py-2.5 rounded-xl border text-[11px] font-semibold transition-all duration-300 ${
                          selectedSlot === "04:30 PM"
                            ? "border-[#D96B27] bg-[#D96B27]/10 text-white shadow-[0_0_20px_rgba(217,107,39,0.15)]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] text-white/80"
                        }`}
                      >
                        04:30 PM - 06:00 PM
                      </button>
                    </div>
                  </div>

                  {/* Booking Checkout Summary */}
                  <div className={`mt-1 border-t border-white/[0.06] pt-4 transition-all duration-500 ${
                    selectedSlot ? "opacity-100 scale-100 max-h-[200px]" : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
                  }`}>
                    <div className="flex items-center justify-between text-xs text-white/50 mb-3 font-semibold">
                      <span>Court Fee & Session (1.5 hrs)</span>
                      <span className="text-white font-bold">₦37,500</span>
                    </div>
                    
                    <button
                      type="button"
                      data-keep-light
                      onClick={async () => {
                        setIsBooking(true);
                        await new Promise(resolve => setTimeout(resolve, 1200));
                        setIsBooking(false);
                        setBookingSuccess(true);
                      }}
                      disabled={isBooking}
                      className="w-full h-11 relative flex items-center justify-center overflow-hidden rounded-xl bg-white text-[11px] font-black uppercase tracking-widest text-[#050505] shadow-[0_4px_20px_rgba(255,255,255,0.08)] transition-all duration-300 hover:bg-white/90 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isBooking ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#050505]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing Paystack...
                        </span>
                      ) : (
                        <span>Pay ₦37,500 Instantly</span>
                      )}
                    </button>
                  </div>

                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-500">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                    <Check className="size-6" />
                  </div>
                  <h4 className="mt-5 text-sm font-bold text-white tracking-wide">Court Slot Secured!</h4>
                  <p className="mt-2 text-[11px] leading-[1.6] text-white/40 max-w-[280px]">
                    Your session is confirmed. A receipt has been sent to your email.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingSuccess(false);
                      setSelectedSlot(null);
                    }}
                    className="mt-6 text-[9px] font-bold uppercase tracking-widest text-[#D96B27] hover:text-[#C4622D] transition-colors underline underline-offset-4"
                  >
                    Reset scheduler preview
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 flex min-h-11 shrink-0 items-center justify-between gap-4 border-t border-[var(--lobb-border)] bg-[var(--lobb-bg)]/85 px-5 py-3 backdrop-blur-md sm:px-8 lg:px-12 select-none">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--lobb-muted)]">&copy; {new Date().getFullYear()} LOBB</span>
        <div className="flex items-center gap-5 text-[9px] font-semibold uppercase tracking-widest text-[var(--lobb-muted)]">
          <Link href="/terms" className="hover:text-[var(--lobb-black)] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[var(--lobb-black)] transition-colors">Privacy</Link>
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
