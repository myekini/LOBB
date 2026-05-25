"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarDays, ChevronDown, Clock3, CreditCard, LogOut, MapPin, Moon, Search, ShieldCheck, Sun, Sunrise, User } from "lucide-react";
import { courtImage } from "@/lib/demo-content";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav, PlayerDesktopNav } from "@/components/layout/player-nav";
import { CoachListCard } from "@/features/coaches/coach-cards";
import { SkeletonBlock, SmallCoachCardSkeleton } from "@/components/common/lobb-skeleton";

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
  const [loadingProfile, setLoadingProfile] = useState(() => {
    // Unauthenticated visitors skip the skeleton: check for a Supabase token synchronously.
    if (typeof window === "undefined") return true;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const ref = url.match(/https:\/\/([^.]+)\./)?.[1] ?? "";
      return ref ? !!localStorage.getItem(`sb-${ref}-auth-token`) : false;
    } catch {
      return false;
    }
  });
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
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-white p-2 shadow-[0_20px_50px_rgba(13,13,13,0.14)]">
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
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium outline-none placeholder:text-[#9b958a] focus:ring-0"
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
                        ? "bg-[var(--lobb-black)] text-white"
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
                href="/auth/login?mode=signup&role=coach"
                className="mt-5 inline-flex h-10 items-center rounded-full bg-[var(--lobb-black)] px-5 text-sm font-black text-white"
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
                className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--lobb-black)] px-5 text-sm font-black text-white"
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#0D0D0D] text-white">

      {/* Background: court image with layered overlays */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={courtImage}
          alt=""
          className="size-full object-cover object-center"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        {/* Base tint */}
        <div className="absolute inset-0 bg-[#0D0D0D]/62" />
        {/* Bottom vignette — darkens proof strip / footer area */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent" />
      </div>

      {/* Page shell */}
      <div className="relative z-10 flex min-h-[100dvh] flex-col">

        {/* ── Nav: 3-column grid keeps logo/links/actions truly balanced ── */}
        <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-12">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.08] ring-1 ring-inset ring-white/10">
              <LobbMark size={18} />
            </span>
            <span className="text-[14px] font-black tracking-tight">LOBB</span>
          </Link>

          {/* Center links — hidden on mobile */}
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/coaches" className="text-[13px] font-medium text-white/58 transition hover:text-white">
              Browse coaches
            </Link>
            <Link href="/how-it-works" className="text-[13px] font-medium text-white/38 transition hover:text-white/70">
              How it works
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href="/auth/login?mode=login"
              className="hidden h-9 items-center rounded-[10px] px-3.5 text-[13px] font-medium text-white/52 transition hover:text-white sm:flex"
            >
              Log in
            </Link>
            <Link
              href="/auth/login?mode=signup"
              className="flex h-9 items-center rounded-[10px] bg-white px-4 text-[13px] font-black text-[#0D0D0D] transition hover:bg-white/[0.9] active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </header>

        {/* ── Hero — vertically centered in remaining space ── */}
        <section className="flex flex-1 items-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-6xl">

            {/* Eyebrow */}
            <div className="mb-5 flex items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both">
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--lobb-clay)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {coachesReady && coachCount > 0
                  ? `${coachCount} verified coaches · Lagos`
                  : "Lagos tennis coaching"}
              </span>
            </div>

            {/* Headline */}
            <h1 className="max-w-[13ch] text-[46px] font-black leading-[1.02] tracking-[-0.022em] text-white text-balance sm:text-[62px] lg:text-[76px] animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-75 fill-mode-both">
              Stop chasing coaches on WhatsApp.
            </h1>

            {/* Subhead */}
            <p className="mt-5 max-w-[400px] text-[15px] font-normal leading-[1.75] text-white/50 sm:text-base animate-in fade-in-0 duration-700 delay-150 fill-mode-both">
              Browse verified Lagos tennis coaches, pick a real available slot, and pay securely — no DMs needed.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
              <Link
                href="/coaches"
                className="group inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--lobb-clay)] px-8 text-[14px] font-black text-white shadow-[0_12px_32px_rgba(196,98,45,0.4)] transition hover:bg-[#D8733C] active:scale-[0.97] sm:w-auto"
              >
                Browse coaches
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login?mode=signup&role=coach"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-[12px] border border-white/[0.14] px-8 text-[14px] font-semibold text-white/60 backdrop-blur-sm transition hover:border-white/25 hover:text-white active:scale-[0.97] sm:w-auto"
              >
                Join as a coach
              </Link>
            </div>

            {/* Log in hint */}
            <p className="mt-4 text-[13px] text-white/30 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
              Already have an account?{" "}
              <Link href="/auth/login?mode=login" className="font-semibold text-white/55 underline underline-offset-4 transition hover:text-white">
                Log in
              </Link>
            </p>

            {/* Coach preview pills — only renders once real coaches are loaded */}
            {coachesReady && coachCount > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
                {liveCoaches.slice(0, 4).map((coach) => (
                  <Link
                    key={coach.id}
                    href={`/coaches/${coach.slug ?? coach.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-1.5 pl-2 pr-4 text-[12px] backdrop-blur-sm transition hover:border-white/[0.2] hover:bg-white/[0.08]"
                  >
                    {coach.profile_photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={coach.profile_photo_url} alt="" className="size-5 rounded-full object-cover" />
                      : <span className="size-5 rounded-full bg-white/[0.08]" />}
                    <span className="font-semibold text-white/80">{coach.full_name.split(" ")[0]}</span>
                    {coach.primary_location && (
                      <span className="text-white/32">· {coach.primary_location}</span>
                    )}
                  </Link>
                ))}
                {coachCount > 4 && (
                  <Link
                    href="/coaches"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-[12px] font-semibold text-white/38 backdrop-blur-sm transition hover:text-white/70"
                  >
                    +{coachCount - 4} more <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Proof strip + footer ── */}
        <div className="shrink-0 px-5 pb-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">

            {/* Three trust signals */}
            <div className="grid grid-cols-1 border-t border-white/[0.08] pt-5 sm:grid-cols-3 animate-in fade-in-0 duration-700 delay-300 fill-mode-both">
              <ProofItem
                icon={<ShieldCheck className="size-3.5" />}
                title={coachesReady && coachCount > 0 ? `${coachCount} verified coaches` : "Verified coaches"}
                body="All profiles reviewed before going live"
              />
              <ProofItem
                icon={<Clock3 className="size-3.5" />}
                title="Real availability"
                body="Book open slots — no WhatsApp chasing"
                bordered
              />
              <ProofItem
                icon={<CreditCard className="size-3.5" />}
                title="Secure payment"
                body="Paystack checkout, held until your session"
                bordered
              />
            </div>

            {/* Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4 text-[11px] text-white/22">
              <span>© {new Date().getFullYear()} LOBB</span>
              <div className="flex items-center gap-5">
                <Link href="/terms" className="transition hover:text-white/50">Terms</Link>
                <Link href="/privacy" className="transition hover:text-white/50">Privacy</Link>
                <Link href="/how-it-works" className="transition hover:text-white/50">How it works</Link>
              </div>
            </div>
          </div>
        </div>

      </div>
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

function ProofItem({ icon, title, body, bordered }: { icon: React.ReactNode; title: string; body: string; bordered?: boolean }) {
  return (
    <div className={`flex items-start gap-3 py-4 ${bordered ? "border-t border-white/[0.08] sm:border-t-0 sm:border-l sm:border-white/[0.08] sm:pl-6" : ""}`}>
      <span className="mt-0.5 shrink-0 text-[var(--lobb-clay)]">{icon}</span>
      <div>
        <p className="text-[12px] font-black text-white">{title}</p>
        <p className="mt-0.5 text-[11px] leading-[1.55] text-white/34">{body}</p>
      </div>
    </div>
  );
}
