"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, MapPin, Search, Trophy, User } from "lucide-react";
import { coaches, courtImage, money } from "@/lib/demo-content";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav } from "@/components/layout/player-nav";
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

function getSessionPrompt() {
  const hour = new Date().getHours();
  if (hour < 12) return "Ready for a clean morning hit?";
  if (hour < 17) return "Find your next afternoon session.";
  return "Line up a calm evening lesson.";
}

function PlayerHomeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0 md:border-b md:border-r-0 md:last:border-b-0">
      <p className="truncate text-[19px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/42">{label}</p>
    </div>
  );
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
    const featuredCoach = liveCoaches.find((coach) => coach.has_availability) ?? liveCoaches[0];

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
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] shadow-[0_8px_22px_rgba(13,13,13,0.05)] transition hover:border-[var(--lobb-clay)]/40"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-4" />
              )}
            </Link>
          </div>
        </header>

        {/* Hero card */}
        <section className="mx-auto max-w-6xl px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0d0d0d] via-[#161512] to-[#241a15] px-6 py-8 text-white shadow-[0_22px_56px_rgba(13,13,13,0.22)] sm:p-10">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[64px] bg-[var(--lobb-clay)]/10 blur-[1px]" aria-hidden="true" />
            <div className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full border border-white/5 bg-white/[0.01]" aria-hidden="true" />
            <div className="relative grid gap-7 md:grid-cols-[minmax(0,1fr)_280px] md:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base animate-bounce">👋</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--lobb-clay)]">
                    {getGreeting()}, {firstName}
                  </span>
                </div>
                <h1 className="mt-4 text-[38px] font-black leading-[1.05] tracking-tight sm:max-w-none sm:text-[56px] text-white">
                  {getSessionPrompt()}
                </h1>
                <p className="mt-4 max-w-xl text-[14px] font-medium leading-[1.6] text-white/58">
                  Search verified Lagos coaches, pick an open slot, and keep the court details tidy in one flow.
                </p>
              </div>

              <div className="grid grid-cols-3 overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.05] shadow-inner md:grid-cols-1">
                <PlayerHomeStat label="Coaches" value={liveCoaches.length} />
                <PlayerHomeStat label="Open slots" value={liveCoaches.filter((coach) => coach.has_availability).length} />
                <PlayerHomeStat label="Top area" value={featuredCoach?.primary_location ?? "Lagos"} />
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
    <main className="relative min-h-svh overflow-hidden bg-[var(--lobb-black)] text-white">
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

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <LobbMark size={22} />
            </span>
            <div>
              <p className="text-[13px] font-black uppercase text-white">LOBB</p>
              <p className="text-[11px] font-semibold text-white/45">Book a coach. Not a favor.</p>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/coaches" className="rounded-full px-4 py-2 text-[13px] font-bold text-white/68 transition hover:bg-white/10 hover:text-white">
              Browse coaches
            </Link>
            <Link href="/coaches/join" className="rounded-full px-4 py-2 text-[13px] font-bold text-white/68 transition hover:bg-white/10 hover:text-white">
              Become a coach
            </Link>
          </nav>
          <Link
            href="/auth/login"
            className="inline-flex h-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] px-4 text-[12px] font-black text-white/75 backdrop-blur transition hover:bg-white/12 hover:text-white"
          >
            Log in
          </Link>
        </header>

        <section className="grid flex-1 items-end gap-10 pb-8 pt-14 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.72fr)] md:items-center md:pb-14 lg:gap-16">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1.5 text-[11px] font-black uppercase text-white/70 backdrop-blur animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both">
              <span className="size-1.5 rounded-full bg-[var(--lobb-clay)]" />
              Lagos tennis coaching, verified
            </div>
            <h1 className="max-w-[11ch] text-[56px] font-black leading-[1.05] text-white sm:text-[76px] lg:text-[92px] animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-75 fill-mode-both">
              Book the court session without the chase.
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-7 text-white/64 sm:text-[18px] animate-in fade-in-0 duration-700 delay-150 fill-mode-both">
              LOBB turns Lagos tennis coaching into a clear marketplace: verified coaches, real
              availability, secure payment, and booking details you can trust.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
              <Link
                href="/coaches"
                className="lobb-cta-pulse group inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-clay)] px-6 text-[14px] font-black text-white shadow-[0_18px_48px_rgba(0,0,0,0.32)] transition hover:bg-[#D8733C] active:scale-[0.98]"
              >
                Find a Coach
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-[54px] items-center justify-center gap-2 rounded-[14px] border border-white/14 bg-white/[0.07] px-6 text-[14px] font-black text-white/78 backdrop-blur transition hover:bg-white/12 hover:text-white active:scale-[0.98]"
              >
                Sign up free
              </Link>
            </div>

            <p className="mt-5 text-[13px] font-medium text-white/50 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
              Are you a Lagos coach?{" "}
              <Link href="/coaches/join" className="font-bold text-[var(--lobb-clay)] hover:underline">
                Apply to teach
              </Link>{" "}
              or{" "}
              <Link href="/auth/login" className="font-bold text-white hover:underline">
                access your portal
              </Link>.
            </p>

            {/* Spacing alignment */}
            <div className="h-4" />
          </div>

          <div className="relative mx-auto w-full max-w-[420px] md:mx-0 md:justify-self-end animate-in fade-in-0 slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            <div className="overflow-hidden rounded-[28px] border border-white/14 bg-[#F2F1EF] p-3 text-[var(--lobb-black)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
              <div className="relative h-[190px] overflow-hidden rounded-[20px] bg-[var(--lobb-black)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coaches[0].hero} alt="" className="size-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[var(--lobb-black)]">
                  <Trophy className="size-3 text-[var(--lobb-clay)]" />
                  Featured coach
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[12px] font-bold text-white/64">{coaches[0].headline}</p>
                  <h2 className="mt-1 text-[28px] font-black leading-none">{coaches[0].name}</h2>
                </div>
              </div>

              <div className="rounded-[20px] bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase text-[var(--lobb-muted)]">Next available</p>
                    <p className="mt-1 text-[18px] font-black">Thu 15 · 7:00 AM</p>
                  </div>
                  <p className="rounded-full bg-[var(--lobb-bg)] px-3 py-1 text-[12px] font-black">
                    {money(coaches[0].rate)}/hr
                  </p>
                </div>
                <Link
                  href={`/coaches/${coaches[0].slug}`}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-black)] text-[13px] font-black text-white transition hover:bg-black/90 active:scale-[0.98]"
                >
                  View coach
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
