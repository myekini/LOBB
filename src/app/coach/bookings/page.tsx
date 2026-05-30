"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Circle, Clock3, MapPin, User, WalletCards } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { showLobbToast } from "@/providers/lobb-global-state";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";

type BookingTab = "upcoming" | "completed" | "cancelled";

const tabs: Array<{ value: BookingTab; label: string }> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function isPendingBooking(booking: DashboardBooking) {
  return booking.status === "pending" || booking.status === "pending_payment";
}

function isUpcomingBooking(booking: DashboardBooking) {
  return booking.status === "confirmed" || isPendingBooking(booking);
}

function paymentStatus(booking: DashboardBooking) {
  return booking.payments?.[0]?.status ?? null;
}

function proximityLabel(startsAt: string) {
  const diffMs = new Date(startsAt).getTime() - Date.now();
  if (diffMs <= 0) return "Started";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hr`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function bookingBucket(booking: DashboardBooking) {
  const start = new Date(booking.starts_at).getTime();
  const today = startOfToday();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const nextWeek = today + 7 * 24 * 60 * 60 * 1000;
  if (start >= today && start < tomorrow) return "Today";
  if (start < nextWeek) return "This week";
  return "Later";
}

export default function CoachBookingsPage() {
  const [tab, setTab] = useState<BookingTab>("upcoming");
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
    () => bookings.filter((booking) => {
      if (tab === "upcoming") return isUpcomingBooking(booking);
      return booking.status === tab;
    }),
    [bookings, tab]
  );
  const upcomingCount = bookings.filter(isUpcomingBooking).length;
  const completedCount = bookings.filter((booking) => booking.status === "completed").length;
  const completedValue = bookings
    .filter((booking) => booking.status === "completed" && !["refunded", "partial_refund"].includes(paymentStatus(booking) ?? ""))
    .reduce((sum, booking) => sum + (booking.coach_payout_ngn ?? 0), 0);
  const groupedBookings = useMemo(() => {
    if (tab !== "upcoming") return null;
    return ["Today", "This week", "Later"].map((label) => ({
      label,
      bookings: visibleBookings.filter((booking) => bookingBucket(booking) === label),
    })).filter((group) => group.bookings.length > 0);
  }, [tab, visibleBookings]);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Bookings" eyebrow="Coach schedule" active="bookings" actionHref="/coach/availability" actionLabel="Availability" actionIcon={CalendarDays} />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <CoachSurface className="grid grid-cols-3 overflow-hidden">
            <BookingStat label="Upcoming" value={String(upcomingCount)} />
            <BookingStat label="Completed" value={String(completedCount)} bordered />
            <BookingStat label="Earned" value={money(completedValue)} bordered />
          </CoachSurface>

          <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1 shadow-[var(--lobb-shadow-card)]">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={`h-11 rounded-[14px] text-sm font-black transition ${
                  tab === item.value ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]" : "text-[var(--lobb-text-secondary)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-5 grid gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => <BookingCardSkeleton key={index} />)
          ) : groupedBookings?.length ? (
            groupedBookings.map((group) => (
              <section key={group.label} className="grid gap-3">
                <div className="flex items-center justify-between pt-2">
                  <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">{group.label}</h2>
                  {group.label === "Today" && (
                    <span className="rounded-full bg-[var(--lobb-clay-light)] px-3 py-1 text-[11px] font-black text-[var(--lobb-clay)]">
                      {group.bookings.length} today
                    </span>
                  )}
                </div>
                {group.bookings.map((booking) => <CoachBookingCard key={booking.id} booking={booking} />)}
              </section>
            ))
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
  const playerProfile = firstJoin(booking.player_profile);
  const isConfirmed = booking.status === "confirmed";
  const isCompleted = booking.status === "completed";
  const isPending = isPendingBooking(booking);

  return (
    <article className="grid gap-4 rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)] md:grid-cols-[150px_minmax(0,1fr)_150px_112px] md:items-center">
      <div>
        <p className="text-sm font-black">{formatBookingDate(booking.starts_at)}</p>
        <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${
          isConfirmed ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : isPending ? "bg-[var(--lobb-warning)]/12 text-[var(--lobb-clay)]" : isCompleted ? "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]" : "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"
        }`}>
          <Circle className="size-2 fill-current" />
          {isConfirmed ? "Confirmed" : isPending ? "Payment pending" : booking.status}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]">
          {playerProfile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={playerProfile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-4.5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-black">{player?.full_name ?? "Player"}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--lobb-text-secondary)]">
            <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{booking.location || "Location not set"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-black md:justify-end">
        {isPending ? <Clock3 className="size-4 text-[var(--lobb-clay)]" /> : <WalletCards className="size-4 text-[var(--lobb-clay)]" />}
        {isPending ? proximityLabel(booking.starts_at) : money(booking.coach_payout_ngn ?? booking.total_amount_ngn)}
      </div>

      <Link href={`/coach/bookings/${booking.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--lobb-bg-inverse)] px-3 text-xs font-black text-[var(--lobb-text-inverse)]">
        Details
        <ArrowRight className="size-3.5" />
      </Link>
    </article>
  );
}

function BookingStat({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border-subtle)]" : ""}`}>
      <p className="truncate text-base font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-text-secondary)]">{label}</p>
    </div>
  );
}
