"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, MapPin, Repeat2, Search } from "lucide-react";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { SmallCoachCard } from "@/features/coaches/coach-cards";
import { createClient } from "@/lib/supabase/client";
import { fetchWithCache } from "@/lib/offline-cache";
import { firstJoin, formatBookingDate, type DashboardBooking } from "@/lib/dashboard-client-types";
import type { CoachPublicProfile } from "@/lib/types";

export default function PlayerHomePage() {
  const [firstName, setFirstName] = useState("Player");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [coaches, setCoaches] = useState<CoachPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    Promise.all([
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return null;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        return data?.full_name?.split(" ")[0] ?? null;
      }),
      fetchWithCache<{ upcoming: DashboardBooking[]; past: DashboardBooking[] }>("lobb.dashboard.player", "/api/dashboard/player"),
      fetch("/api/coaches?limit=3").then((response) => response.ok ? response.json() : { coaches: [] }),
    ]).then(([name, dashboard, coachPayload]) => {
      if (!alive) return;
      if (name) setFirstName(name);
      setBookings(dashboard.upcoming ?? []);
      setCoaches((coachPayload as { coaches?: CoachPublicProfile[] }).coaches?.slice(0, 3) ?? []);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const nextBooking = useMemo(() => [...bookings].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null, [bookings]);
  const coach = firstJoin(nextBooking?.coaches);
  const needsPayment = nextBooking && ["pending", "pending_payment"].includes(nextBooking.status) && nextBooking.payments?.[0]?.status !== "paid";

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader active="home" title="Home" eyebrow="Player" />
      <section className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 lg:pt-10">
        <div className="flex flex-col gap-5 border-b border-[var(--lobb-border-subtle)] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-medium text-[var(--lobb-clay)]">Welcome back, {firstName}</p><h1 className="mt-2 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Your next time on court.</h1></div>
          <Link href="/coaches" className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] px-5 text-sm font-medium text-white"><Search className="size-4" /> Find a coach</Link>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          {loading ? <SkeletonBlock className="h-64 rounded-[var(--lobb-radius-lg)]" /> : nextBooking ? (
            <article className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4"><p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--lobb-clay)]">Next session</p><span className="text-xs font-medium capitalize text-[var(--lobb-text-secondary)]">{needsPayment ? "Payment pending" : nextBooking.status}</span></div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">{formatBookingDate(nextBooking.starts_at)}</h2>
              <div className="mt-5 flex items-center gap-3 border-t border-[var(--lobb-border-subtle)] pt-5"><div className="size-12 overflow-hidden rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)]">{coach?.profile_photo_url && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={coach.profile_photo_url} alt="" className="size-full object-cover" /></>}</div><div className="min-w-0"><p className="truncate font-medium">{coach?.full_name ?? "Your coach"}</p><p className="truncate text-sm text-[var(--lobb-text-secondary)]">{coach?.headline ?? "Tennis coach"}</p></div></div>
              <p className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm leading-6 text-[var(--lobb-text-secondary)]"><MapPin className="mt-1 size-4 text-[var(--lobb-clay)]" /><span className="break-words">{nextBooking.location || "Location pending"}</span></p>
              <div className="mt-6 flex gap-2"><Link href={`/dashboard/bookings/${nextBooking.id}`} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-4 text-sm font-medium text-[var(--lobb-text-inverse)]">{needsPayment ? "Complete payment" : "View booking"}<ArrowRight className="size-4" /></Link><Link href="/dashboard/bookings" className="flex h-11 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-sm font-medium">All bookings</Link></div>
            </article>
          ) : (
            <article className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6"><CalendarDays className="size-5 text-[var(--lobb-clay)]" /><h2 className="mt-6 text-2xl font-semibold">Nothing booked yet</h2><p className="mt-2 text-sm leading-6 text-[var(--lobb-text-secondary)]">Choose a verified coach and reserve a time that works for you.</p><Link href="/coaches" className="mt-6 inline-flex h-11 items-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)]">Browse coaches <ArrowRight className="size-4" /></Link></article>
          )}
          <aside className="lobb-surface-inset border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-5"><Repeat2 className="size-5 text-[var(--lobb-clay)]" /><h2 className="mt-5 text-lg font-semibold">Book your next session</h2><p className="mt-2 text-sm leading-6 text-[var(--lobb-text-secondary)]">Compare verified coaches by location, experience and price.</p><Link href="/coaches" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--lobb-clay)]">Explore coaches <ArrowRight className="size-4" /></Link></aside>
        </div>
        {coaches.length > 0 && <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recommended coaches</h2><Link href="/coaches" className="text-sm font-medium text-[var(--lobb-clay)]">View all</Link></div><div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">{coaches.map((item) => <SmallCoachCard key={item.id} coach={item} />)}</div></section>}
      </section>
      <PlayerBottomNav active="home" />
    </main>
  );
}
