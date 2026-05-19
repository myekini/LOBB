"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Circle, MapPin, Phone, User } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/components/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton, SkeletonBlock } from "@/components/lobb-skeleton";

type CoachDashboardPayload = {
  upcoming_bookings: DashboardBooking[];
  recent_bookings: DashboardBooking[];
  earnings: {
    net_this_week_ngn: number;
    net_this_month_ngn: number;
    net_all_time_ngn: number;
    pending_payout_ngn: number;
  } | null;
  profile_completion: { percent: number };
  reviews: Array<{ id: string; rating: number; comment: string | null; player_first_name: string; created_at: string }>;
};

function LobbMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="17" r="7" fill="currentColor" />
    </svg>
  );
}

export default function CoachDashboardPage() {
  const [data, setData] = useState<CoachDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWithCache<CoachDashboardPayload>("lobb.dashboard.coach", "/api/dashboard/coach")
      .then((payload) => {
        if (alive) setData(payload);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load dashboard" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const upcoming = data?.upcoming_bookings ?? [];
  const nextSession = upcoming[0];
  const completion = data?.profile_completion?.percent ?? 0;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <LobbMark />
          <span className="text-[13px] font-black tracking-[0.22em]">LOBB</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]" aria-label="Notifications">
            <Bell className="size-4" />
          </button>
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
            <User className="size-4 text-[var(--lobb-muted)]" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-5 pt-5">
        <Link href="/coach/profile" className="flex items-center justify-between rounded-[18px] border border-[var(--lobb-border)] border-l-4 border-l-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <div>
            <p className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle className="size-4 text-[var(--lobb-clay)]" />
              Profile {completion}% complete
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lobb-surface-2)]">
              <div className="h-full bg-[var(--lobb-clay)]" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Complete to go live →</p>
          </div>
        </Link>

        <h1 className="mt-8 text-lg font-black">This Week</h1>
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <Stat value={String(upcoming.length)} label="Sessions Upcoming" />
          <Stat value={money(data?.earnings?.net_this_week_ngn ?? 0)} label="Net This Week" bordered />
          <Stat value={money(data?.earnings?.pending_payout_ngn ?? 0)} label="Pending Payout" bordered />
        </div>

        <h2 className="mt-8 text-base font-black">Next Session</h2>
        {loading ? (
          <div className="mt-3 rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5">
            <SkeletonBlock className="h-4 w-40" />
            <div className="mt-6 flex items-center gap-3">
              <SkeletonBlock className="size-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-3 w-48" />
              </div>
            </div>
          </div>
        ) : nextSession ? (
          <section className="mt-3 overflow-hidden rounded-[24px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
          <p className="text-sm font-black">{formatBookingDate(nextSession.starts_at)}</p>

          <div className="mt-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
              <User className="size-5 text-white/60" />
            </div>
            <div>
              <p className="text-lg font-black">{firstJoin(nextSession.players)?.full_name ?? "Player"}</p>
              {nextSession.player_notes && <p className="mt-1 text-sm font-medium italic text-white/55">&quot;{nextSession.player_notes}&quot;</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm font-semibold text-white/80">
            <p className="flex items-center gap-3">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              Player phone appears in booking confirmation SMS
            </p>
            <p className="flex items-center gap-3">
              <MapPin className="size-4 text-[var(--lobb-clay)]" />
              {nextSession.location}
            </p>
          </div>
        </section>
        ) : (
          <section className="mt-3 rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 text-sm font-semibold text-[var(--lobb-muted)]">
            No upcoming sessions yet.
          </section>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-base font-black">All Bookings</h2>
          <Link href="/coach/bookings" className="text-xs font-black text-[var(--lobb-clay)]">See all →</Link>
        </div>
        <section className="mt-3 space-y-3">
          {loading ? Array.from({ length: 3 }).map((_, index) => (
            <BookingCardSkeleton key={index} />
          )) : (data?.recent_bookings ?? []).slice(0, 3).map((booking) => (
            <CompactBookingRow key={booking.id} booking={booking} />
          ))}
        </section>

        {(data?.reviews ?? []).length > 0 && (
          <>
            <h2 className="mt-8 text-base font-black">Reviews</h2>
            <section className="mt-3 space-y-3">
              {(data?.reviews ?? []).slice(0, 3).map((review) => (
                <article key={review.id} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
                  <p className="font-black">{review.rating}/5 from {review.player_first_name}</p>
                  {review.comment && <p className="mt-2 font-medium text-[var(--lobb-muted)]">&quot;{review.comment}&quot;</p>}
                </article>
              ))}
            </section>
          </>
        )}
      </section>

      <CoachBottomNav active="home" />
    </main>
  );
}

function Stat({ value, label, bordered }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border)]" : ""}`}>
      <p className="truncate text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.1em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}

function CompactBookingRow({ booking }: { booking: DashboardBooking }) {
  return (
    <article className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
      <div className="rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-bg)] px-2 py-1 text-center">
        <p className="text-[10px] font-black uppercase text-[var(--lobb-muted)]">
          {new Date(booking.starts_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", timeZone: "Africa/Lagos" })}
        </p>
        <p className="text-[11px] font-black text-[var(--lobb-clay)]">
          {new Date(booking.starts_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{firstJoin(booking.players)?.full_name ?? "Player"}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">
          <Circle className={`size-2 fill-current ${booking.status === "confirmed" ? "text-[var(--lobb-success)]" : "text-[var(--lobb-muted)]"}`} />
          {booking.status}
        </p>
      </div>
      <p className="text-sm font-black">{money(booking.total_amount_ngn)}</p>
    </article>
  );
}
