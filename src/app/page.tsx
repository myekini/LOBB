"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, CalendarCheck, MapPin, Search, ShieldCheck, Star, Trophy, User } from "lucide-react";
import { coaches, courtImage, money } from "@/lib/demo-content";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav } from "@/components/player-nav";
import { SmallCoachCard } from "@/components/coach-cards";
import { SkeletonBlock, SmallCoachCardSkeleton } from "@/components/lobb-skeleton";

function LobbMark({ size = 24, color = "#C4622D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="17" r="5.5" fill={color} />
    </svg>
  );
}

const landingStats = [
  { label: "Verified Lagos coaches", value: "24" },
  { label: "Avg. coach rating", value: "4.9" },
  { label: "Bookable in", value: "90s" },
];

const landingSteps = [
  { icon: Search,       label: "Find a coach",  copy: "Filter by area, level, and session style." },
  { icon: CalendarCheck, label: "Pick a slot",   copy: "See clear availability before you commit." },
  { icon: ShieldCheck,  label: "Pay securely",  copy: "Payment and cancellation terms stay explicit." },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setProfile(null);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("role, full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const p = data as HomeProfile | null;

        if (p?.role === "coach") {
          router.replace("/coach/dashboard");
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

    async function loadCoaches() {
      try {
        const supabase = createClient();
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

    loadProfile();
    loadCoaches();

    return () => { cancelled = true; };
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
    const featured   = liveCoaches[0];
    const firstName  = profile.full_name.split(" ")[0] || "there";

    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
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
            className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] transition hover:border-[var(--lobb-clay)]/40"
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <User className="size-4" />
            )}
          </Link>
        </header>

        {/* Hero card with search */}
        <section className="px-5 pt-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 fill-mode-both">
          <div className="relative h-[232px] overflow-visible rounded-[24px]">
            <div className="absolute inset-0 overflow-hidden rounded-[24px]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D0D] via-[#190e00] to-[#2c1500]" />
              <div className="absolute -right-6 -top-6 size-48 rounded-full bg-[var(--lobb-clay)]/10 blur-2xl" aria-hidden="true" />
              <div className="absolute -bottom-4 left-8 size-32 rounded-full bg-[var(--lobb-clay)]/6 blur-xl" aria-hidden="true" />
            </div>
            <div className="absolute bottom-12 left-4 right-4 text-white">
              <h1 className="text-[26px] font-black leading-tight tracking-[-0.01em]">
                {getGreeting()}, {firstName}
              </h1>
              <p className="mt-1 text-[13px] font-medium text-white/60">
                Browse verified coaches and book a slot.
              </p>
            </div>
            {/* Floating search bar */}
            <Link
              href="/coaches"
              className="absolute -bottom-6 left-3 right-3 flex h-[52px] items-center gap-3 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 text-[var(--lobb-muted)] shadow-[0_16px_40px_rgba(13,13,13,0.14)] transition hover:border-[var(--lobb-clay)]/30 hover:shadow-[0_16px_40px_rgba(13,13,13,0.18)]"
            >
              <Search className="size-4 text-[var(--lobb-clay)]" />
              <span className="text-[13px] font-semibold">Search coaches, areas, levels…</span>
            </Link>
          </div>
        </section>

        {/* Coaches grid */}
        <section className="mt-12 animate-in fade-in-0 duration-500 delay-200 fill-mode-both">
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-[15px] font-black">Top Coaches in Lagos</h2>
            <Link href="/coaches" className="text-[12px] font-bold text-[var(--lobb-muted)] transition hover:text-[var(--lobb-black)]">
              See all →
            </Link>
          </div>
          {loadingCoaches ? (
            <div className="grid grid-cols-2 gap-3 px-5 pb-2 sm:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SmallCoachCardSkeleton key={i} />
              ))}
            </div>
          ) : liveCoaches.length === 0 ? (
            <p className="px-5 text-[13px] font-semibold text-[var(--lobb-muted)]">
              No coaches yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-5 pb-2 sm:grid-cols-3">
              {liveCoaches.map((coach) => (
                <SmallCoachCard key={coach.slug} coach={coach} />
              ))}
            </div>
          )}
        </section>

        {/* Most booked coach */}
        <section className="mt-6 px-5 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-black">Most Booked</h2>
            <Link href="/coaches" className="text-[12px] font-bold text-[var(--lobb-muted)] transition hover:text-[var(--lobb-black)]">
              See all →
            </Link>
          </div>
          {loadingCoaches ? (
            <SkeletonBlock className="h-[168px] rounded-[22px]" />
          ) : featured ? (
            <div className="relative overflow-hidden rounded-[22px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_40px_rgba(13,13,13,0.2)]">
              {featured.profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.profile_photo_url}
                  alt=""
                  className="absolute bottom-0 right-0 h-full w-36 object-cover opacity-60 grayscale"
                />
              )}
              <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-[var(--lobb-black)] to-transparent" />
              <div className="relative z-10 max-w-[68%]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lobb-clay)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                  <span className="size-1.5 rounded-full bg-white/60" />
                  {featured.session_count > 0 ? `${featured.session_count} sessions` : "New coach"}
                </span>
                <p className="mt-3.5 text-[12px] font-bold text-white/70">
                  {featured.avg_rating != null ? `★ ${featured.avg_rating}` : "New"} · {featured.hourly_rate_ngn == null ? "Rate pending" : `${money(featured.hourly_rate_ngn)}/hr`}
                </p>
                <h3 className="mt-1.5 text-[22px] font-black leading-tight">{featured.full_name}</h3>
                <p className="mt-1 text-[12px] text-white/60">{featured.headline}</p>
                <Link
                  href={`/book/${featured.slug}/step-1`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--lobb-clay)] px-5 py-2.5 text-[12px] font-black transition-all duration-200 hover:bg-[#D8733C] hover:-translate-y-px active:scale-[0.97]"
                >
                  Book Now →
                </Link>
              </div>
            </div>
          ) : null}
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
            <h1 className="max-w-[11ch] text-[56px] font-black leading-[0.9] text-white sm:text-[76px] lg:text-[92px] animate-in fade-in-0 slide-in-from-bottom-6 duration-700 delay-75 fill-mode-both">
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
            <p className="mt-4 text-[13px] font-semibold text-white/50 animate-in fade-in-0 duration-500 delay-300 fill-mode-both">
              Are you a coach?{" "}
              <Link href="/coaches/join" className="font-bold text-white/80 underline underline-offset-2 transition hover:text-white">
                Apply here →
              </Link>
            </p>

            <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4 animate-in fade-in-0 duration-700 delay-300 fill-mode-both">
              {landingStats.map((stat) => (
                <div key={stat.label} className="px-3 first:pl-0">
                  <p className="text-[25px] font-black leading-none text-white">{stat.value}</p>
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-white/45">{stat.label}</p>
                </div>
              ))}
            </div>
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

              <div className="grid grid-cols-3 gap-2 py-3">
                <div className="rounded-[14px] bg-white p-3">
                  <Star className="mb-2 size-4 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                  <p className="text-[15px] font-black">{coaches[0].rating}</p>
                  <p className="text-[10px] font-bold text-[var(--lobb-muted)]">Rating</p>
                </div>
                <div className="rounded-[14px] bg-white p-3">
                  <CalendarCheck className="mb-2 size-4 text-[var(--lobb-clay)]" />
                  <p className="text-[15px] font-black">{coaches[0].weekendSlots}</p>
                  <p className="text-[10px] font-bold text-[var(--lobb-muted)]">Slots</p>
                </div>
                <div className="rounded-[14px] bg-white p-3">
                  <MapPin className="mb-2 size-4 text-[var(--lobb-success)]" />
                  <p className="text-[15px] font-black">VI</p>
                  <p className="text-[10px] font-bold text-[var(--lobb-muted)]">Area</p>
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

            <div className="mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              {landingSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="rounded-[18px] border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                    <Icon className="size-4 text-[var(--lobb-clay)]" />
                    <p className="mt-3 text-[13px] font-black text-white">{step.label}</p>
                    <p className="mt-1 text-[12px] leading-5 text-white/45">{step.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
