"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Clock3, Star } from "lucide-react";
import { PlayerBottomNav, PlayerDesktopNav } from "@/components/layout/player-nav";
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
    <main className="lobb-app-page min-h-screen px-4 pb-28 pt-7 text-[var(--lobb-text-primary)] sm:px-6 lg:pt-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black text-[var(--lobb-clay)]">Player dashboard</p>
            <h1 className="mt-1 text-[26px] font-black tracking-tight sm:text-[34px]">My bookings</h1>
          </div>
          <PlayerDesktopNav active="bookings" />
        </div>

        <div className="lobb-segmented mt-6 grid grid-cols-2 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1 sm:max-w-md">
          {(["upcoming", "past"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`h-11 text-sm font-black capitalize transition ${
                tab === item ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]" : "text-[var(--lobb-text-secondary)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="my-7 flex items-center gap-3">
          <span className="text-xs font-black text-[var(--lobb-muted)] capitalize">{tab}</span>
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
    <article className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-black leading-5 sm:text-base">{formatBookingDate(booking.starts_at)}</p>
        <p className={`inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs font-black ${
          isConfirmed
            ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]"
            : isUpcoming
              ? "bg-[var(--lobb-warning)]/12 text-[var(--lobb-warning)]"
              : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)]"
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
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-[var(--lobb-warning)]/25 bg-[var(--lobb-warning)]/10 p-3 text-xs font-semibold leading-5 text-[var(--lobb-text-primary)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {payment?.status === "paid"
            ? "Payment is recorded. We are finalizing this booking confirmation."
            : "This booking is waiting for payment confirmation."}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {isUpcoming ? (
          <>
          <Link href={`/dashboard/bookings/${booking.id}`} className="flex h-10 flex-1 items-center justify-center rounded-[12px] border border-[var(--lobb-border)] text-xs font-black transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)]">
              View details
            </Link>
            <button disabled={!isConfirmed} className="h-10 flex-1 rounded-[12px] border border-[var(--lobb-border)] text-xs font-black text-[var(--lobb-muted)] transition disabled:opacity-45">
              Cancel
            </button>
          </>
        ) : booking.can_leave_review ? (
          <Link href={`/dashboard/review/${booking.id}`} className="ml-auto flex h-10 items-center justify-center rounded-[12px] border border-[var(--lobb-clay)] px-5 text-xs font-black text-[var(--lobb-clay)]">
            Leave a review
          </Link>
        ) : (
          <span className="ml-auto flex h-10 items-center justify-center rounded-[12px] bg-[var(--lobb-surface-2)] px-5 text-xs font-black text-[var(--lobb-muted)]">
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
        <Link href="/coaches" className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[var(--lobb-clay)] px-6 text-sm font-black text-white">
          Find a coach
        </Link>
      }
    />
  );
}
