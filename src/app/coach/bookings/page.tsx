"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Circle, MapPin, User, WalletCards } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { showLobbToast } from "@/providers/lobb-global-state";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachKicker, CoachSurface } from "@/components/common/coach-surface";

type BookingTab = "confirmed" | "completed" | "cancelled";

const tabs: Array<{ value: BookingTab; label: string }> = [
  { value: "confirmed", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CoachBookingsPage() {
  const [tab, setTab] = useState<BookingTab>("confirmed");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetchWithCache<{ bookings: DashboardBooking[] }>("lobb.coach.bookings", "/api/bookings")
      .then((payload) => {
        if (alive) setBookings(payload.bookings ?? []);
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

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => booking.status === tab),
    [bookings, tab]
  );
  const confirmedCount = bookings.filter((booking) => booking.status === "confirmed").length;
  const completedCount = bookings.filter((booking) => booking.status === "completed").length;
  const completedValue = bookings
    .filter((booking) => booking.status === "completed")
    .reduce((sum, booking) => sum + (booking.coach_payout_ngn ?? 0), 0);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 text-[var(--lobb-black)] sm:px-6">
      <CoachFlowHeader title="Bookings" eyebrow="Coach schedule" active="bookings" actionHref="/coach/availability" actionLabel="Slots" actionIcon={CalendarDays} />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <CoachSurface className="grid grid-cols-3 overflow-hidden">
          <BookingStat label="Upcoming" value={String(confirmedCount)} />
          <BookingStat label="Done" value={String(completedCount)} bordered />
          <BookingStat label="Earned" value={money(completedValue)} bordered />
        </CoachSurface>

        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1 shadow-[0_12px_28px_rgba(13,13,13,0.05)] lg:max-w-xl">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`h-11 rounded-[14px] text-sm font-black transition ${
                tab === item.value ? "bg-[var(--lobb-black)] text-white shadow-[0_8px_18px_rgba(13,13,13,0.18)]" : "text-[var(--lobb-muted)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <BookingCardSkeleton key={index} />)
          ) : visibleBookings.length ? (
            visibleBookings.map((booking) => (
              <CoachBookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <LobbEmptyState
              title="No bookings here yet"
              body="Confirmed sessions and player requests will appear here."
            />
          )}
        </section>
      </section>

      <CoachBottomNav active="bookings" />
    </main>
  );
}

function CoachBookingCard({ booking }: { booking: DashboardBooking }) {
  const player = firstJoin(booking.players);
  const isConfirmed = booking.status === "confirmed";
  const isCompleted = booking.status === "completed";

  return (
    <article className="overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)] px-4 py-3">
        <div>
          <CoachKicker>{isConfirmed ? "Next session" : isCompleted ? "Completed" : "Booking"}</CoachKicker>
          <p className="mt-1 text-[15px] font-black">{formatBookingDate(booking.starts_at)}</p>
        </div>
        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${
          isConfirmed ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"
        }`}>
          <Circle className="size-2 fill-current" />
          {isConfirmed ? "Confirmed" : booking.status}
        </p>
      </div>

      <div className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
          <User className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-black">{player?.full_name ?? "Player"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--lobb-muted)]">
            <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{booking.location || "Location not set"}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--lobb-border)] pt-4">
        <p className="inline-flex items-center gap-2 text-sm font-black">
          <WalletCards className="size-4 text-[var(--lobb-clay)]" />
          {money(booking.coach_payout_ngn ?? booking.total_amount_ngn)}
        </p>
        <span className="text-xs font-black text-[var(--lobb-muted)]">Coach payout</span>
      </div>

      <Link href={`/coach/bookings/${booking.id}`} className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[var(--lobb-black)] text-xs font-black text-white">
        View Details
      </Link>
      </div>
    </article>
  );
}

function BookingStat({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border)]" : ""}`}>
      <p className="truncate text-base font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
