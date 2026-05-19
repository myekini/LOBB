"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Star } from "lucide-react";
import { PlayerBottomNav } from "@/components/player-nav";
import { LobbEmptyState } from "@/components/lobb-empty-state";
import { showLobbToast } from "@/components/lobb-global-state";
import { firstJoin, formatBookingDate, type DashboardBooking } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton } from "@/components/lobb-skeleton";

type BookingTab = "upcoming" | "past";

export default function DashboardPage() {
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const [upcoming, setUpcoming] = useState<DashboardBooking[]>([]);
  const [past, setPast] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const bookings = tab === "upcoming" ? upcoming : past;

  useEffect(() => {
    let alive = true;

    fetchWithCache<{ upcoming: DashboardBooking[]; past: DashboardBooking[] }>("lobb.dashboard.player", "/api/dashboard/player")
      .then((payload) => {
        if (alive) {
          setUpcoming(payload.upcoming ?? []);
          setPast(payload.past ?? []);
        }
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load bookings" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">My Bookings</h1>

        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          {(["upcoming", "past"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-11 rounded-[14px] text-sm font-black capitalize transition ${
                tab === item ? "bg-[var(--lobb-black)] text-white shadow-[0_8px_18px_rgba(13,13,13,0.18)]" : "text-[var(--lobb-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="my-7 flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">{tab}</span>
          <span className="h-px flex-1 bg-[var(--lobb-border)]" />
        </div>

        {loading ? (
          <section className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => <BookingCardSkeleton key={index} />)}
          </section>
        ) : bookings.length ? (
          <section className="space-y-4">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </section>
        ) : (
          <EmptyBookings />
        )}
      </section>

      <PlayerBottomNav active="bookings" />
    </main>
  );
}

function BookingCard({ booking }: { booking: DashboardBooking }) {
  const coach = firstJoin(booking.coaches);
  const isUpcoming = booking.status === "confirmed";
  const image = coach?.profile_photo_url || "/favicon.svg";

  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
      <p className="text-[15px] font-black">{formatBookingDate(booking.starts_at)}</p>

      <div className="mt-5 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="size-12 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate font-black">{coach?.full_name ?? "Coach"}</p>
          <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach?.headline || coach?.primary_location || booking.location}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs font-black">
            <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            {booking.reviews?.[0]?.rating ?? "New"}
          </p>
        </div>
      </div>

      <p className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
        isUpcoming ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-black)]"
      }`}>
        {isUpcoming ? <Circle className="size-2 fill-current" /> : <CheckCircle2 className="size-3.5" />}
        {isUpcoming ? "Confirmed" : "Completed"}
      </p>

      <div className="mt-5 flex gap-2">
        {isUpcoming ? (
          <>
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--lobb-border)] text-xs font-black">
              View Details
            </Link>
            <button className="h-10 flex-1 rounded-full border border-[var(--lobb-border)] text-xs font-black text-[var(--lobb-muted)]">
              Cancel
            </button>
          </>
        ) : booking.can_leave_review ? (
          <Link href={`/dashboard/review/${booking.id}`} className="ml-auto flex h-10 items-center justify-center rounded-full border border-[var(--lobb-clay)] px-5 text-xs font-black text-[var(--lobb-clay)]">
            Leave a Review
          </Link>
        ) : (
          <span className="ml-auto flex h-10 items-center justify-center rounded-full bg-[var(--lobb-surface-2)] px-5 text-xs font-black text-[var(--lobb-muted)]">
            Review locked
          </span>
        )}
      </div>
    </article>
  );
}

function EmptyBookings() {
  return (
    <LobbEmptyState
      title="No upcoming sessions"
      body="No sessions yet. Find a coach and get on court."
      action={
        <Link href="/coaches" className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--lobb-clay)] px-6 text-sm font-black text-white">
          Find a Coach
        </Link>
      }
    />
  );
}
