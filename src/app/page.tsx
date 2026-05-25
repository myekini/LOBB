"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
      label: "Morning court window",
      prompt: "Set up a clean morning hit.",
      detail: "Early sessions are best for focused drills, lighter heat, and a calmer court.",
      accent: "from-[#f7c56b]/18",
    };
  }
  if (hour < 17) {
    return {
      Icon: Sun,
      period: "Afternoon",
      label: "Afternoon match prep",
      prompt: "Find your next focused lesson.",
      detail: "Compare coaches by area, price, and availability before the day gets crowded.",
      accent: "from-[#d8a557]/16",
    };
  }
  return {
    Icon: Moon,
    period: "Evening",
    label: "Evening recovery session",
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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [liveCoaches, setLiveCoaches]       = useState<CoachPublicProfile[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);
  const [coachQuery, setCoachQuery]         = useState("");
  const [coachLocation, setCoachLocation]   = useState("All");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const locationChips = useMemo(() => {
    const locations = liveCoaches.flatMap((coach) => [
      coach.primary_location,
      ...coach.service_areas,
    ]).filter(Boolean) as string[];

    return ["All", ...Array.from(new Set(locations)).slice(0, 5)];
  }, [liveCoaches]);

  const filteredCoaches = useMemo(() => {
    const query = coachQuery.trim().toLowerCase();

    return liveCoaches.filter((coach) => {
      const locationMatch =
        coachLocation === "All" ||
        (coach.primary_location ?? "").toLowerCase().includes(coachLocation.toLowerCase()) ||
        coach.service_areas.some((area) => area.toLowerCase().includes(coachLocation.toLowerCase()));

      if (!locationMatch) return false;

      if (!query) return true;

      const searchable = [
        coach.full_name,
        coach.headline ?? "",
        coach.primary_location ?? "",
        ...coach.service_areas,
        ...coach.specializations,
        ...coach.skill_levels,
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [coachLocation, coachQuery, liveCoaches]);

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

        if (p?.role === "coach") {
          router.replace("/coach/dashboard");
          return;
        }

        if (p?.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (!p || (p.role === "player" && !p.full_name)) {
          router.replace("/auth/setup/player");
          return;
        }

        setProfile(p);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    // onAuthStateChange fires immediately with the current session (INITIAL_SESSION)
    // and again on any sign-in/sign-out — far more reliable than a one-shot getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          handleUserId(session.user.id);
        } else {
          setProfile(null);
          setLoadingProfile(false);
        }
      }
    );

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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  /* ── Loading ── */
  if (loadingProfile) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
        {/* Header skeleton — matches real header height */}
        <header className="flex h-[68px] items-center justify-between border-b border-[var(--lobb-border)] px-5">
          <SkeletonBlock className="h-8 w-20 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </header>
        {/* Hero card skeleton */}
        <div className="px-5 pt-4">
          <SkeletonBlock className="h-[232px] rounded-[24px]" />
        </div>
        {/* Coach grid skeleton */}
        <section className="mt-12 px-5">
          <div className="mb-3 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-4 w-12" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SmallCoachCardSkeleton key={i} />
            ))}
          </div>
        </section>
        {/* Featured card skeleton */}
        <section className="mt-6 px-5">
          <SkeletonBlock className="mb-3 h-4 w-28" />
          <SkeletonBlock className="h-[168px] rounded-[22px]" />
        </section>
      </main>
    );
  }

  /* ── Authenticated player home ── */
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
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-2.5">
              <LobbMark size={20} />
              <div>
                <p className="text-[12px] font-black tracking-[0.2em] text-[var(--lobb-black)]">LOBB</p>
                <p className="text-[10px] font-semibold text-[var(--lobb-muted)]">Lagos tennis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PlayerDesktopNav active="home" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  aria-expanded={profileMenuOpen}
                  aria-label="Open profile menu"
                  className="flex h-11 items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] py-1 pl-1 pr-3 text-[var(--lobb-black)] shadow-[0_8px_22px_rgba(13,13,13,0.05)] transition hover:border-[var(--lobb-clay)]/40"
                >
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <User className="size-4" />
                    )}
                  </span>
                  <span className="hidden max-w-24 truncate text-xs font-black md:block">{firstName}</span>
                  <ChevronDown className="size-3.5 text-[var(--lobb-muted)]" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-white p-2 shadow-[0_24px_58px_rgba(13,13,13,0.16)]">
                    <div className="flex items-center gap-3 border-b border-[var(--lobb-border)] p-3">
                      <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                          <User className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{profile.full_name}</p>
                        <p className="text-[11px] font-semibold text-[var(--lobb-muted)]">Player account</p>
                      </div>
                    </div>
                    <ProfileMenuLink href="/dashboard" icon={<CalendarDays className="size-4" />} label="My bookings" />
                    <ProfileMenuLink href="/coaches" icon={<Search className="size-4" />} label="Browse coaches" />
                    <ProfileMenuLink href="/profile" icon={<User className="size-4" />} label="Profile settings" />
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-1 flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-sm font-black text-red-700 transition hover:bg-red-50"
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

        {/* Hero card */}
        <section className="mx-auto max-w-6xl px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0d0d0d] px-5 py-6 text-white shadow-[0_18px_48px_rgba(13,13,13,0.18)] sm:px-8 sm:py-7">
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.accent} via-transparent to-[var(--lobb-clay)]/10`} aria-hidden="true" />
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_42%)]" aria-hidden="true" />
            <div className="relative">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] p-1.5 pr-3">
                  <span className="flex size-10 items-center justify-center rounded-[14px] bg-white/[0.05] text-[var(--lobb-clay)]">
                    <MoodIcon className="size-4.5" />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                    {mood.period}
                  </span>
                </div>
                <div className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--lobb-clay)]">
                    {getGreeting()}, {firstName}
                </div>
                <h1 className="mt-3 text-[34px] font-black leading-[1.05] tracking-tight text-white sm:text-[48px]">
                  {mood.prompt}
                </h1>
                <p className="mt-3 max-w-xl text-[14px] font-medium leading-[1.6] text-white/58">
                  {mood.detail}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/64">
                    {liveCoaches.length} verified coaches
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/64">
                    Search below by coach, area, or skill
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Search and location filters */}
        <section className="sticky top-[68px] z-30 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/94 py-3 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-5">
            <label className="flex h-[52px] items-center gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 shadow-[0_10px_28px_rgba(58,43,20,0.05)]">
              <Search className="size-5 shrink-0 text-[var(--lobb-clay)]" />
              <input
                value={coachQuery}
                onChange={(event) => setCoachQuery(event.target.value)}
                placeholder="Search coach, area, skill"
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none placeholder:text-[#9b958a] focus:ring-0"
              />
            </label>
            {locationChips.length > 1 && (
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {locationChips.map((location) => (
                  <button
                    key={location}
                    onClick={() => setCoachLocation(location)}
                    className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                      coachLocation === location
                        ? "bg-[var(--lobb-black)] text-white shadow-[0_10px_24px_rgba(13,13,13,0.14)]"
                        : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Coaches list */}
        <section className="mx-auto mt-5 max-w-6xl px-5 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-black">Book a verified coach</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--lobb-muted)]">
                <MapPin className="size-3.5 text-[var(--lobb-clay)]" />
                {coachLocation === "All" ? "Lagos areas" : coachLocation}
              </p>
            </div>
            <Link href="/coaches" className="shrink-0 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-2 text-[12px] font-black text-[var(--lobb-black)] transition hover:border-[var(--lobb-clay)]/40">
              See all
            </Link>
          </div>

          {loadingCoaches ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SmallCoachCardSkeleton key={i} />
              ))}
            </div>
          ) : liveCoaches.length === 0 ? (
            <div className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 text-sm font-semibold text-[var(--lobb-muted)]">
              No coaches yet. Check back soon.
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5">
              <p className="font-black text-[var(--lobb-black)]">No coaches match that search.</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Try another area or clear your search.</p>
              <button
                onClick={() => { setCoachQuery(""); setCoachLocation("All"); }}
                className="mt-4 inline-flex h-11 items-center rounded-full bg-[var(--lobb-black)] px-5 text-sm font-black text-white"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCoaches.map((coach) => (
                <CoachListCard key={coach.id} coach={coach} />
              ))}
            </div>
          )}
        </section>

        <PlayerBottomNav active="home" />
      </main>
    );
  }

  /* ── Unauthenticated splash ── */
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--lobb-black)] text-white">
      <div className="absolute inset-0 select-none" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={courtImage}
          alt=""
          className="size-full object-cover object-center opacity-80"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/60 to-[#0D0D0D]/15" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 py-4 sm:px-8 lg:px-10">
        <header className="flex min-h-12 items-center justify-between gap-4 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06]">
              <LobbMark size={20} />
            </span>
            <span className="min-w-0 text-[13px] font-black text-white">
              LOBB <span className="hidden font-semibold text-white/50 sm:inline">· Book a coach. Not a favor.</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/coaches" className="text-[13px] font-black text-white/76 transition hover:text-white">
              Browse coaches
            </Link>
            <Link href="/how-it-works" className="text-[13px] font-black text-white/56 transition hover:text-white">
              How it works
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/auth/login?mode=signup"
              className="hidden h-10 items-center justify-center rounded-[14px] bg-white px-4 text-[12px] font-black text-[var(--lobb-black)] transition hover:bg-white/90 sm:inline-flex"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login?mode=login"
              className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/14 bg-white/[0.07] px-4 text-[12px] font-black text-white/82 backdrop-blur transition hover:bg-white/12 hover:text-white"
            >
              Log in
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-4 pt-10 sm:pt-12 lg:pb-6">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[11px] font-black uppercase text-white/72 backdrop-blur animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both">
              <span className="size-1.5 rounded-full bg-[var(--lobb-clay)]" />
              Lagos tennis coaching
            </div>
            <h1 className="max-w-[14ch] text-[40px] font-black leading-[1.03] text-white sm:text-[58px] lg:text-[70px] animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-75 fill-mode-both">
              Book a verified tennis coach in Lagos.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-white/68 sm:text-[17px] animate-in fade-in-0 duration-700 delay-150 fill-mode-both">
              Compare coaches, pick a real slot, and pay securely. LOBB keeps the session details clear before anyone reaches the court.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
              <Link
                href="/auth/login?mode=signup&role=player"
                className="lobb-cta-pulse group inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-clay)] px-6 text-[14px] font-black text-white shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition hover:bg-[#D8733C] active:scale-[0.98]"
              >
                Sign up to book
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login?mode=signup&role=coach"
                className="inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] border border-white/14 bg-white/[0.07] px-6 text-[14px] font-black text-white/82 backdrop-blur transition hover:bg-white/12 hover:text-white active:scale-[0.98]"
              >
                Become a coach
              </Link>
            </div>
            <p className="mt-4 text-sm font-semibold text-white/52 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
              Already have an account? <Link href="/auth/login?mode=login" className="font-black text-white underline decoration-white/30 underline-offset-4">Log in</Link>
            </p>
          </div>

          <div className="mt-9 grid gap-2 border-t border-white/12 pt-4 text-white/80 sm:grid-cols-3 animate-in fade-in-0 duration-700 delay-300 fill-mode-both">
            <LandingProof icon={<ShieldCheck className="size-4" />} title="Verified coaches" body="Profiles are reviewed before they go live." />
            <LandingProof icon={<Clock3 className="size-4" />} title="Real availability" body="Pick open session times without chat chasing." />
            <LandingProof icon={<CreditCard className="size-4" />} title="Secure payment" body="Paystack checkout and clear receipts." />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="mt-1 flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-black text-[var(--lobb-black)] transition hover:bg-[var(--lobb-surface)]"
    >
      <span className="text-[var(--lobb-clay)]">{icon}</span>
      {label}
    </Link>
  );
}

function LandingProof({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 py-2 sm:pr-5">
      <span className="flex size-8 items-center justify-center rounded-[12px] border border-white/12 bg-white/[0.07] text-[var(--lobb-clay)]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-5 text-white/52">{body}</span>
      </span>
    </div>
  );
}
