"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Search, User } from "lucide-react";
import { courtImage, money } from "@/lib/mock-data";
import type { CoachPublicProfile } from "@/lib/types";
import { PlayerBottomNav } from "@/components/player-nav";
import { SmallCoachCard } from "@/components/coach-cards";
import { CoachCardSkeleton, SkeletonBlock } from "@/components/lobb-skeleton";

/* ─── Inline LOBB mark — used in multiple render paths ─── */
function LobbMark({ size = 24, color = "#C4622D" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="17" r="5.5" fill={color} />
    </svg>
  );
}

type HomeProfile = {
  role: "player" | "coach" | "admin";
  full_name: string | null;
  avatar_url: string | null;
};

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<HomeProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [liveCoaches, setLiveCoaches] = useState<CoachPublicProfile[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadSupabaseProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      return data as HomeProfile | null;
    }

    async function loadCoaches() {
      const supabase = createClient();
      const { data } = await supabase
        .from("coach_profiles_public")
        .select("*")
        .eq("status", "active")
        .order("session_count", { ascending: false })
        .limit(6);
      if (!cancelled && data) setLiveCoaches(data as CoachPublicProfile[]);
    }

    async function loadProfile() {
      try {
        const timeout = new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 2500);
        });
        const data = await Promise.race([loadSupabaseProfile(), timeout]);

        if (cancelled) {
          return;
        }

        if (data?.role === "coach") {
          router.replace("/coach/dashboard");
          return;
        }

        setProfile(data);
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();
    loadCoaches();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ── Loading ── */
  if (loadingProfile) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-5 text-[var(--lobb-black)]">
        <header className="flex h-[52px] items-center justify-between">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="size-9 rounded-full" />
        </header>
        <SkeletonBlock className="mt-4 h-[232px] rounded-[24px]" />
        <div className="mt-10 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <section className="mt-6 space-y-3">
          <SkeletonBlock className="h-5 w-36" />
          <CoachCardSkeleton />
        </section>
      </main>
    );
  }

  /* ── Authenticated player home ── */
  if (profile?.role === "player" && profile.full_name) {
    const featured = liveCoaches[0];
    const firstName = profile.full_name.split(" ")[0] || "there";

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
          <div className="flex items-center gap-2.5">
            <button
              aria-label="Notifications"
              className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
            >
              <Bell className="size-4" />
            </button>
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"
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

        {/* Hero card with search */}
        <section className="px-5 pt-4">
          <div className="relative h-[232px] overflow-visible rounded-[24px]">
            <div className="absolute inset-0 overflow-hidden rounded-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={courtImage} alt="Lagos tennis court" className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/30 to-black/5" />
            </div>
            {/* LOBB Verified pill */}
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1 backdrop-blur">
              <LobbMark size={10} color="white" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
                Verified Lagos coaches
              </span>
            </div>
            <div className="absolute bottom-12 left-4 right-4 text-white">
              <h1 className="text-[26px] font-black leading-tight tracking-[-0.01em]">
                Good morning, {firstName}
              </h1>
              <p className="mt-1 text-[13px] font-medium text-white/60">
                Book your next session in a few taps.
              </p>
            </div>
            {/* Floating search bar */}
            <Link
              href="/coaches"
              className="absolute -bottom-6 left-3 right-3 flex h-[52px] items-center gap-3 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 text-[var(--lobb-muted)] shadow-[0_16px_40px_rgba(13,13,13,0.14)]"
            >
              <Search className="size-4 text-[var(--lobb-clay)]" />
              <span className="text-[13px] font-semibold">Search coaches, areas, levels…</span>
            </Link>
          </div>
        </section>

        {/* Filter chips */}
        <section className="mt-12 px-5">
          <div className="flex flex-wrap gap-2">
            {["All", "Beginners", "Kids", "Adults", "Competitive"].map((chip, i) => (
              <button
                key={chip}
                className={`h-8 rounded-full px-4 text-[12px] font-bold transition ${
                  i === 0
                    ? "bg-[var(--lobb-black)] text-white"
                    : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        {/* Coaches near you */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-[15px] font-black">Coaches Near You</h2>
            <Link href="/coaches" className="text-[12px] font-bold text-[var(--lobb-muted)]">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-2 sm:grid-cols-3">
            {liveCoaches.map((coach) => (
              <SmallCoachCard key={coach.slug} coach={coach} />
            ))}
          </div>
        </section>

        {/* Featured: Available This Weekend */}
        <section className="mt-6 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-black">Available This Weekend</h2>
            <Link href="/coaches" className="text-[12px] font-bold text-[var(--lobb-muted)]">
              See all →
            </Link>
          </div>
          {featured ? (
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
                  Active on LOBB
                </span>
                <p className="mt-3.5 text-[12px] font-bold text-white/70">
                  {featured.avg_rating != null ? `★ ${featured.avg_rating}` : "New coach"} · {money(featured.hourly_rate_ngn)}/hr
                </p>
                <h3 className="mt-1.5 text-[22px] font-black leading-tight">{featured.full_name}</h3>
                <p className="mt-1 text-[12px] text-white/60">{featured.headline}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {featured.session_count} sessions completed
                </p>
                <Link
                  href={`/coaches/${featured.slug}`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--lobb-clay)] px-5 py-2.5 text-[12px] font-black"
                >
                  Book Now →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-[22px] bg-[var(--lobb-surface)] p-5 text-center text-sm font-semibold text-[var(--lobb-muted)]">
              No coaches available yet — check back soon.
            </div>
          )}
        </section>

        <PlayerBottomNav active="home" />
      </main>
    );
  }

  /* ── Unauthenticated splash ── */
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-[#0D0D0D]">
      {/* Background image */}
      <div className="absolute inset-0 select-none" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={courtImage}
          alt=""
          className="size-full object-cover object-center"
        />
        {/* Left-heavy gradient so text is always legible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/88 to-[#0D0D0D]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col px-6 pb-10 pt-11 sm:px-10 sm:pt-14">

        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LobbMark size={22} />
            <span className="text-[13px] font-black tracking-[0.22em] text-white">LOBB</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 backdrop-blur">
            Lagos · NG
          </span>
        </header>

        {/* Hero copy — pushed to bottom of screen */}
        <div className="mt-auto space-y-6 sm:max-w-sm">

          {/* Eyebrow rule */}
          <div className="flex items-center gap-3">
            <span className="block h-px w-5 flex-shrink-0 bg-[#C4622D]" aria-hidden="true" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C4622D]">
              Verified coaching, on demand
            </p>
          </div>

          {/* Main headline */}
          <div>
            <h1 className="text-[52px] font-black leading-[0.92] tracking-[-0.015em] text-white sm:text-[60px]">
              Book a coach.
            </h1>
            <h1 className="text-[52px] font-black leading-[0.92] tracking-[-0.015em] text-white/40 sm:text-[60px]">
              Not a favor.
            </h1>
          </div>

          {/* Sub */}
          <p className="text-[14px] leading-[1.65] text-white/50">
            Lagos&apos;s verified tennis coaches — bookable in under 90 seconds.
            No referrals. No WhatsApp chains.
          </p>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-2">
            {["✓ Video-verified", "✓ Book in 90s", "✓ Full refund"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold text-white/60 backdrop-blur"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-3 pt-1">
            <Link
              href="/auth/login"
              className="flex h-[54px] w-full items-center justify-center rounded-[14px] bg-white text-[14px] font-black text-[#0D0D0D] shadow-[0_18px_48px_rgba(0,0,0,0.35)] transition active:scale-[0.98]"
            >
              Get Started
            </Link>
            <p className="text-center text-[13px] text-white/35">
              Already a member?{" "}
              <Link
                href="/auth/login?mode=login"
                className="font-semibold text-white/70 transition hover:text-white"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
