"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Script from "next/script";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock3,
  MapPin,
  Navigation,
  Repeat,
  Star,
  UserRound,
} from "lucide-react";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { showLobbToast } from "@/providers/lobb-global-state";
import { durationMinutes, firstJoin, type DashboardBooking, type JoinedCoach } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { readApiError, toastAppError } from "@/lib/client-errors";

type BookingTab = "upcoming" | "past";

/* ─────────────────────────── Date & link helpers ────────────────────────── */

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)} – ${formatTime(endsAt)}`;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}&travelmode=driving`;
}

/* ───────────────────────────── Status helpers ───────────────────────────── */

function paymentStatus(booking: DashboardBooking) {
  return booking.payments?.[0]?.status ?? null;
}

function needsPayment(booking: DashboardBooking) {
  return (
    (booking.status === "pending" || booking.status === "pending_payment") &&
    paymentStatus(booking) !== "paid"
  );
}

function StatusChip({ booking }: { booking: DashboardBooking }) {
  const isConfirmed = booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";
  const isConfirming = !isConfirmed && !isCancelled && paymentStatus(booking) === "paid";
  const pendingPay = needsPayment(booking);

  const label = isConfirmed
    ? "Confirmed"
    : isCancelled
      ? "Cancelled"
      : isConfirming
        ? "Confirming"
        : pendingPay
          ? "Payment pending"
          : booking.status.replaceAll("_", " ");

  const cls = isConfirmed
    ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]"
    : isCancelled
      ? "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]"
      : isConfirming || pendingPay
        ? "bg-[var(--lobb-warning)]/12 text-[var(--lobb-warning)]"
        : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)]";

  return (
    <p className={`inline-flex shrink-0 items-center gap-2 px-3 py-1.5 text-xs font-medium capitalize ${cls}`}>
      {isConfirmed ? (
        <Circle className="lobb-dot-pulse size-2 fill-current" />
      ) : pendingPay || isConfirming ? (
        <Clock3 className="size-3.5" />
      ) : (
        <CheckCircle2 className="size-3.5" />
      )}
      {label}
    </p>
  );
}

function CoachAvatar({ coach, size = "size-12" }: { coach: JoinedCoach | null; size?: string }) {
  if (coach?.profile_photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={coach.profile_photo_url} alt="" className={`${size} shrink-0 rounded-[var(--lobb-radius-lg)] object-cover transition-transform duration-300 group-hover:scale-105`} />;
  }
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]`}>
      <UserRound className="size-5" />
    </span>
  );
}

/* ────────────────────────────────── Page ────────────────────────────────── */

export default function DashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const [upcoming, setUpcoming] = useState<DashboardBooking[]>([]);
  const [past, setPast] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paystackReady, setPaystackReady] = useState(false);

  // API returns starts_at descending; the next session is the soonest one.
  const sortedUpcoming = useMemo(
    () => [...upcoming].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [upcoming],
  );

  useEffect(() => {
    if (pathname === "/dashboard") {
      router.replace("/dashboard/bookings");
    }
  }, [pathname, router]);

  // next/script's onLoad won't fire if the Paystack SDK is already loaded from
  // another page — detect the global directly so pay buttons don't stay disabled.
  useEffect(() => {
    const w = window as typeof window & { PaystackPop?: unknown };
    if (w.PaystackPop) {
      setPaystackReady(true);
      return;
    }
    const id = window.setInterval(() => {
      if (w.PaystackPop) {
        setPaystackReady(true);
        window.clearInterval(id);
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

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

  const resumePayment = async (bookingId: string) => {
    if (payingId) return;
    setPayingId(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/pay`, { method: "POST" });
      if (!response.ok) throw await readApiError(response, "PAYMENT_INIT_FAILED");
      const payload = (await response.json()) as { reference?: string; access_code?: string };
      if (!payload.reference || !payload.access_code) throw new Error("Could not restart payment. Try again.");
      const Paystack = (window as typeof window & { PaystackPop?: new () => { resumeTransaction: (accessCode: string, callbacks: { onSuccess: (transaction: { reference: string }) => void; onCancel: () => void; onError: (error: { message?: string }) => void }) => void } }).PaystackPop;
      if (!Paystack) throw new Error("Secure payment is still loading. Try again.");
      new Paystack().resumeTransaction(payload.access_code, {
        onSuccess: (transaction) => {
          const reference = transaction.reference || payload.reference!;
          router.push(`/book/confirm?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          setPayingId(null);
          showLobbToast({ type: "info", message: "Payment paused. You can continue whenever you’re ready." });
        },
        onError: (error) => {
          setPayingId(null);
          toastAppError(new Error(error.message || "Paystack could not open."), "PAYMENT_INIT_FAILED");
        },
      });
    } catch (error) {
      toastAppError(error, "PAYMENT_INIT_FAILED");
      setPayingId(null);
    }
  };

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" onLoad={() => setPaystackReady(true)} />
      <PlayerHeader active="bookings" title="Bookings" eyebrow="Player" />
      <section className="mx-auto max-w-5xl px-4 pt-7 sm:px-6 lg:pt-10">
        <div className="lobb-segmented relative grid grid-cols-2 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1 sm:max-w-md">
          <span
            aria-hidden="true"
            className={`lobb-segmented-thumb pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] bg-[var(--lobb-bg-inverse)] shadow-[var(--lobb-shadow-card)] ${
              tab === "past" ? "translate-x-full" : "translate-x-0"
            }`}
          />
          {(["upcoming", "past"] as const).map((item) => (
            <LobbButton variant="unstyled"
              key={item}
              onClick={() => setTab(item)}
              className={`relative z-10 h-11 text-sm font-medium capitalize transition-colors duration-300 active:scale-[0.98] ${
                tab === item ? "text-[var(--lobb-text-inverse)]" : "text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)]"
              }`}
            >
              {item}
            </LobbButton>
          ))}
        </div>

        <div className="my-7 flex items-center gap-3">
          <span key={tab} className="animate-in fade-in-0 slide-in-from-bottom-1 text-xs font-medium capitalize text-[var(--lobb-text-secondary)] duration-300">{tab}</span>
          <span className="h-px flex-1 bg-[var(--lobb-border-subtle)]" />
        </div>

        {loading ? (
          <div>
            <SkeletonBlock className="h-[260px] rounded-[var(--lobb-radius-lg)]" />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => <BookingCardSkeleton key={index} />)}
            </div>
          </div>
        ) : tab === "upcoming" ? (
          sortedUpcoming.length ? (
            <section key="upcoming" className="grid gap-4 lg:grid-cols-2">
              {sortedUpcoming.map((booking, index) => (
                <div key={booking.id} className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500" style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}>
                  <BookingCard booking={booking} payingId={payingId} onPay={resumePayment} paystackReady={paystackReady} />
                </div>
              ))}
            </section>
          ) : (
            <EmptyBookings tab="upcoming" />
          )
        ) : past.length ? (
          <div key="past">
            <PastStats bookings={past} />
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              {past.map((booking, index) => (
                <div
                  key={booking.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500"
                  style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
                >
                  <BookingCard booking={booking} payingId={payingId} onPay={resumePayment} paystackReady={paystackReady} />
                </div>
              ))}
            </section>
          </div>
        ) : (
          <EmptyBookings tab="past" />
        )}
      </section>

      <PlayerBottomNav active="bookings" />
    </main>
  );
}

/* ──────────────────────────── Past stats strip ──────────────────────────── */

function PastStats({ bookings }: { bookings: DashboardBooking[] }) {
  const played = bookings.filter(
    (b) => b.status !== "cancelled" && (paymentStatus(b) === "paid" || b.status === "completed"),
  );
  const hours = played.reduce((sum, b) => sum + durationMinutes(b.starts_at, b.ends_at), 0) / 60;
  const coachCount = new Set(played.map((b) => b.coach_id)).size;
  const toReview = bookings.filter((b) => b.can_leave_review).length;

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500">
      <div className="grid grid-cols-3 border-y border-[var(--lobb-border-subtle)]">
        {([
          [String(played.length), played.length === 1 ? "session played" : "sessions played"],
          [hours % 1 === 0 ? String(hours) : hours.toFixed(1), "hours on court"],
          [String(coachCount), coachCount === 1 ? "coach trained with" : "coaches trained with"],
        ] as const).map(([value, label]) => (
          <div key={label} className="border-r border-[var(--lobb-border-subtle)] px-3 py-4 first:pl-0 last:border-r-0 last:pr-0 sm:px-5">
            <p className="text-[26px] font-semibold tabular-nums tracking-tight sm:text-[32px]">{value}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-secondary)]">{label}</p>
          </div>
        ))}
      </div>
      {toReview > 0 && (
        <p className="mt-4 inline-flex items-center gap-2 bg-[var(--lobb-clay-light)] px-3 py-2 text-xs font-medium text-[var(--lobb-clay)]">
          <Star className="size-3.5 fill-current" />
          {toReview === 1 ? "1 session is ready to review" : `${toReview} sessions are ready to review`}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────── Booking card ────────────────────────────── */

function BookingCard({
  booking,
  payingId,
  onPay,
  paystackReady,
}: {
  booking: DashboardBooking;
  payingId: string | null;
  onPay: (id: string) => void;
  paystackReady: boolean;
}) {
  const coach = firstJoin(booking.coaches);
  const isUpcoming = booking.is_upcoming ?? booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";
  const pendingPay = isUpcoming && needsPayment(booking);
  const isConfirming = isUpcoming && !pendingPay && booking.status !== "confirmed";
  const ownReview = booking.reviews?.find((r) => !r.removed_at);
  const coachProfileHref = coach ? `/coaches/${coach.slug ?? coach.id}` : "/coaches";

  return (
    <article className="lobb-surface-outlined group h-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[var(--lobb-clay)]/35 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium leading-5 sm:text-base">{formatDay(booking.starts_at)}</p>
          <p className="mt-0.5 text-xs font-bold text-[var(--lobb-text-secondary)]">{formatTimeRange(booking.starts_at, booking.ends_at)}</p>
        </div>
        <StatusChip booking={booking} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <CoachAvatar coach={coach} />
        <div className="min-w-0">
          <p className="truncate font-medium">{coach?.full_name ?? "Coach"}</p>
          <p className="truncate text-sm font-medium text-[var(--lobb-text-secondary)]">{coach?.headline || coach?.primary_location || "Tennis coach"}</p>
        </div>
      </div>

      <p className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5 text-xs font-medium leading-5 text-[var(--lobb-text-secondary)]">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--lobb-clay)]" />
        <span className="min-w-0 break-words">{booking.location || "Location pending"}</span>
      </p>

      {ownReview && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--lobb-text-secondary)]">
          You rated <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" /> {ownReview.rating}
        </p>
      )}

      {isConfirming && (
        <p className="mt-4 flex items-start gap-2 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-warning)]/25 bg-[var(--lobb-warning)]/10 p-3 text-xs font-medium leading-5 text-[var(--lobb-text-primary)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Payment is recorded. We are finalizing this booking confirmation.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {pendingPay ? (
          <>
            <LobbButton variant="unstyled"
              onClick={() => onPay(booking.id)}
              disabled={payingId !== null || !paystackReady}
              className="flex h-10 flex-1 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] text-xs font-medium text-white transition duration-300 hover:bg-[var(--lobb-clay-dark)] active:scale-[0.98] disabled:opacity-60"
            >
              {payingId === booking.id ? "Starting payment…" : "Complete payment"}
            </LobbButton>
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex h-10 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-xs font-medium transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)] active:scale-[0.98]">
              Details
            </Link>
          </>
        ) : isUpcoming ? (
          <>
            <a
              href={mapsUrl(booking.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] text-xs font-medium transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)] active:scale-[0.98]"
            >
              <Navigation className="size-3.5 text-[var(--lobb-clay)]" /> Directions
            </a>
            <Link href={`/dashboard/bookings/${booking.id}`} className="flex h-10 flex-1 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] text-xs font-medium transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)] active:scale-[0.98]">
              View details
            </Link>
          </>
        ) : (
          <>
            {!isCancelled && (
              <Link
                href={coachProfileHref}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)] text-xs font-medium text-[var(--lobb-clay)] transition duration-300 hover:bg-[var(--lobb-clay)] hover:text-white active:scale-[0.98]"
              >
                <Repeat className="size-3.5" /> Book again
              </Link>
            )}
            {booking.can_leave_review ? (
              <Link href={`/dashboard/review/${booking.id}`} className="flex h-10 flex-1 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-xs font-medium text-[var(--lobb-text-inverse)] transition duration-300 hover:bg-[var(--lobb-clay)] active:scale-[0.98]">
                Leave a review
              </Link>
            ) : (
              <Link href={`/dashboard/bookings/${booking.id}`} className={`flex h-10 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-xs font-medium transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)] active:scale-[0.98] ${isCancelled ? "flex-1" : ""}`}>
                Details
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────────── Empty state ────────────────────────────── */

function EmptyBookings({ tab }: { tab: BookingTab }) {
  if (tab === "past") {
    return (
      <LobbEmptyState
        title="No past sessions yet"
        body="Your completed sessions and court history will show up here."
      />
    );
  }

  return <LobbEmptyState title="No upcoming sessions" body="Your confirmed and pending sessions will appear here." action={<Link href="/coaches" className="inline-flex h-12 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] px-6 text-sm font-medium text-white">Find a coach</Link>} />;
}
