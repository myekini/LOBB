"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Circle, Clock3, MapPin, Phone, User, WalletCards } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachKicker, CoachSurface } from "@/components/common/coach-surface";

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
  coach?: { status?: string | null } | null;
  availability_slots_count?: number;
  reviews: Array<{ id: string; rating: number; comment: string | null; player_first_name: string; created_at: string }>;
};

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
  const coachStatus = data?.coach?.status ?? "draft";
  const needsAvailability = coachStatus === "active" && !loading && (data?.availability_slots_count ?? 0) === 0;
  const completionCard =
    coachStatus === "pending_review"
      ? {
          icon: Clock3,
          title: "Profile submitted for review",
          detail: "We will notify you by SMS when your profile is approved.",
          progress: 100,
          tone: "var(--lobb-clay)",
        }
      : coachStatus === "active"
      ? {
          icon: CheckCircle2,
          title: "Live on LOBB",
          detail: "Players can find and book you now.",
          progress: 100,
          tone: "var(--lobb-success)",
        }
      : {
          icon: AlertTriangle,
          title: `Profile ${completion}% complete`,
          detail: "Complete your profile to submit for review",
          progress: completion,
          tone: "var(--lobb-clay)",
        };
  const CompletionIcon = completionCard.icon;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Coach Home" eyebrow="LOBB console" />

      <section className="mx-auto max-w-md pt-5">
        <Link
          href="/coach/profile"
          className="block rounded-[22px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]"
          style={{ borderLeftColor: completionCard.tone }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <CoachKicker>Profile status</CoachKicker>
              <p className="mt-3 flex items-center gap-2 text-lg font-black">
                <CompletionIcon className="size-5" style={{ color: completionCard.tone }} />
              {completionCard.title}
              </p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white/62">{completionCard.detail}</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{completionCard.progress}%</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
            <div className="h-full rounded-full" style={{ width: `${completionCard.progress}%`, backgroundColor: completionCard.tone }} />
          </div>
        </Link>

        {needsAvailability && (
          <Link
            href="/coach/availability"
            className="mt-4 block rounded-[18px] border border-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]"
          >
            <p className="font-black text-[var(--lobb-clay)]">Set availability to receive bookings</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
              Your profile is live, but players will not see bookable times until at least one weekly window is set.
            </p>
          </Link>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat icon={CalendarDays} value={String(upcoming.length)} label="Upcoming" />
          <Stat icon={WalletCards} value={money(data?.earnings?.net_this_week_ngn ?? 0)} label="Week" />
          <Stat icon={Clock3} value={money(data?.earnings?.pending_payout_ngn ?? 0)} label="Pending" />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-base font-black">Next Session</h2>
          <Link href="/coach/availability" className="text-xs font-black text-[var(--lobb-clay)]">Availability</Link>
        </div>
        {loading ? (
          <CoachSurface className="mt-3 p-5">
            <SkeletonBlock className="h-4 w-40" />
            <div className="mt-6 flex items-center gap-3">
              <SkeletonBlock className="size-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-3 w-48" />
              </div>
            </div>
          </CoachSurface>
        ) : nextSession ? (
          <section className="mt-3 overflow-hidden rounded-[22px] bg-[var(--lobb-surface)] p-5 shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
          <p className="text-sm font-black">{formatBookingDate(nextSession.starts_at)}</p>

          <div className="mt-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--lobb-surface-2)]">
              <User className="size-5 text-[var(--lobb-muted)]" />
            </div>
            <div>
              <p className="text-lg font-black">{firstJoin(nextSession.players)?.full_name ?? "Player"}</p>
              {nextSession.player_notes && <p className="mt-1 text-sm font-medium italic text-[var(--lobb-muted)]">&quot;{nextSession.player_notes}&quot;</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-[var(--lobb-border)] pt-5 text-sm font-semibold text-[var(--lobb-muted)]">
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
          <CoachSurface className="mt-3 p-5 text-sm font-semibold text-[var(--lobb-muted)]">
            No upcoming sessions yet.
          </CoachSurface>
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

function Stat({ value, label, icon: Icon }: { value: string; label: string; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
      <Icon className="size-4 text-[var(--lobb-clay)]" />
      <p className="mt-3 truncate text-base font-black">{value}</p>
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
