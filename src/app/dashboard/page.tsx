"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Clock3, Star } from "lucide-react";
import { PlayerBottomNav } from "@/components/layout/player-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { showLobbToast } from "@/providers/lobb-global-state";
import { firstJoin, formatBookingDate, type DashboardBooking } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";

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
    <main className="min-h-screen bg-[var(--lobb-bg)] px-4 pb-28 pt-7 text-[var(--lobb-black)] sm:px-6 lg:pt-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">Player dashboard</p>
            <h1 className="mt-1 text-[26px] font-black tracking-tight sm:text-[34px]">My Bookings</h1>
          </div>
          <Link href="/coaches" className="hidden h-11 items-center justify-center rounded-full bg-[var(--lobb-black)] px-5 text-sm font-black text-white shadow-[0_10px_26px_rgba(13,13,13,0.14)] sm:flex">
            Find a Coach
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1 shadow-[0_12px_28px_rgba(13,13,13,0.05)] sm:max-w-md">
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
          <section className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => <BookingCardSkeleton key={index} />)}
          </section>
        ) : bookings.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
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
  const isConfirmed = booking.status === "confirmed";
  const isUpcoming = isConfirmed || booking.status === "pending" || booking.status === "pending_payment";
  const payment = booking.payments?.[0];
  const image = coach?.profile_photo_url || "/favicon.svg";
  const statusLabel = isConfirmed
    ? "Confirmed"
    : payment?.status === "paid"
      ? "Confirming"
      : booking.status === "pending" || booking.status === "pending_payment"
        ? "Pending payment"
        : booking.status;

  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-black leading-5 sm:text-base">{formatBookingDate(booking.starts_at)}</p>
        <p className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
          isConfirmed
            ? "bg-[#e8f4ed] text-[var(--lobb-success)]"
            : isUpcoming
              ? "bg-[#fff7e0] text-[var(--lobb-warning)]"
              : "bg-[var(--lobb-surface-2)] text-[var(--lobb-black)]"
        }`}>
          {isConfirmed ? <Circle className="size-2 fill-current" /> : isUpcoming ? <Clock3 className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          {statusLabel}
        </p>
      </div>

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

      {!isConfirmed && isUpcoming && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[#ffe0b2] bg-[#fffaf0] p-3 text-xs font-semibold leading-5 text-[#7c4a03]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {payment?.status === "paid"
            ? "Payment is recorded. We are finalizing this booking confirmation."
            : "This booking is waiting for payment confirmation."}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {isUpcoming ? (
          <>
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--lobb-border)] text-xs font-black">
              View Details
            </Link>
            <button disabled={!isConfirmed} className="h-10 flex-1 rounded-full border border-[var(--lobb-border)] text-xs font-black text-[var(--lobb-muted)] disabled:opacity-45">
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
