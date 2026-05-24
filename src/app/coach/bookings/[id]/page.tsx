"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Circle, MapPin, MessageCircle, Phone, User, WalletCards, X } from "lucide-react";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { NATIONAL_STADIUM_COURTS } from "@/lib/types";
import { showLobbToast } from "@/providers/lobb-global-state";
import {
  durationMinutes,
  firstJoin,
  formatBookingDate,
  money,
  type DashboardBooking,
} from "@/lib/dashboard-client-types";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";

export default function CoachBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking]     = useState<DashboardBooking | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/bookings/${params.id}`)
      .then(async (response) => {
        const payload = (await response.json()) as { booking?: DashboardBooking; error?: string };
        if (!response.ok || !payload.booking) throw new Error(payload.error ?? "Booking not found");
        if (alive) setBooking(payload.booking);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load booking" });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  const cancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by coach" }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; refund_label?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to cancel booking");
      showLobbToast({ type: "success", message: `Booking cancelled. Player will receive a full refund.` });
      router.push("/coach/bookings");
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to cancel booking" });
    } finally {
      setCancelling(false);
      setShowCancel(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-10 text-[var(--lobb-text-primary)] sm:px-6">
        <CoachFlowHeader title="Booking" eyebrow="Loading" showLogout={false} />
        <section className="mx-auto max-w-5xl pt-5">
          <BookingCardSkeleton />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-10 text-[var(--lobb-text-primary)] sm:px-6">
        <CoachFlowHeader title="Booking" eyebrow="Not found" showLogout={false} />
        <section className="mx-auto max-w-5xl pt-5">
          <h1 className="text-xl font-black">Booking not found</h1>
          <Link href="/coach/bookings" className="mt-5 block text-sm font-black text-[var(--lobb-clay)]">Back to bookings</Link>
        </section>
      </main>
    );
  }

  const player = firstJoin(booking.players);
  const playerProfile = firstJoin(booking.player_profile);
  const payment = booking.payments?.[0];
  const isConfirmed = booking.status === "confirmed";
  const sessionInFuture = new Date(booking.starts_at).getTime() > Date.now();
  const canCancel = isConfirmed && sessionInFuture;

  const courtLabel = booking.location_venue_id === "national_stadium" && booking.location_court_id
    ? NATIONAL_STADIUM_COURTS.find((c) => c.id === booking.location_court_id)?.label ?? null
    : null;

  const sessionRef = payment?.paystack_reference ?? booking.paystack_reference ?? null;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-10 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Booking Detail" eyebrow="Coach schedule" actionHref="/coach/bookings" actionLabel="List" showLogout={false} />
      <section className="mx-auto max-w-5xl pt-5 lg:pt-7">
        <Link href="/coach/bookings" className="mb-4 inline-flex items-center gap-2 text-xs font-black text-[var(--lobb-text-secondary)]">
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>

        <section className="rounded-[22px] bg-[var(--lobb-bg-inverse)] p-5 text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-modal)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${isConfirmed ? "bg-[var(--lobb-success)]/20 text-white" : "bg-white/10 text-white/70"}`}>
                <Circle className="size-2 fill-current text-[var(--lobb-success)]" />
                {booking.status}
              </span>
              <h2 className="mt-5 text-[28px] font-black leading-tight text-white sm:text-[36px]">{formatBookingDate(booking.starts_at)}</h2>
              <p className="mt-2 text-sm font-semibold text-white/58">
                {durationMinutes(booking.starts_at, booking.ends_at)} minutes · {money(booking.total_amount_ngn)} session
              </p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-white/[0.06] p-4 sm:min-w-[220px]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Coach payout</p>
              <p className="mt-2 text-2xl font-black text-white">{money(booking.coach_payout_ngn ?? booking.total_amount_ngn)}</p>
              <p className="mt-1 text-xs font-semibold text-white/50">From this session</p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <section className="space-y-4">
            <DetailSection title="Player">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]">
                  <User className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">{player?.full_name ?? "Player"}</p>
                  {booking.player_notes && (
                    <p className="mt-1 text-sm font-medium italic text-[var(--lobb-text-secondary)]">&quot;{booking.player_notes}&quot;</p>
                  )}
                </div>
              </div>
              {playerProfile?.phone_number ? (
                <div className="mt-4 flex items-center gap-3">
                  <a
                    href={`tel:${playerProfile.phone_number}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] py-2.5 text-xs font-black"
                  >
                    <Phone className="size-3.5 text-[var(--lobb-clay)]" />
                    Call Player
                  </a>
                  <a
                    href={`https://wa.me/${playerProfile.phone_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] py-2.5 text-xs font-black"
                  >
                    <MessageCircle className="size-3.5 text-[var(--lobb-clay)]" />
                    WhatsApp
                  </a>
                </div>
              ) : (
                <p className="mt-4 flex items-center gap-2 text-sm font-black text-[var(--lobb-text-secondary)]">
                  <Phone className="size-4 text-[var(--lobb-clay)]" />
                  Contact details are in your confirmation email
                </p>
              )}
            </DetailSection>

            <DetailSection title="Location">
              <p className="flex items-start gap-2 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                {booking.location || "Location not specified"}
              </p>
              {courtLabel && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay-light)] px-3 py-1 text-xs font-black text-[var(--lobb-clay)]">
                  Court: {courtLabel}
                </p>
              )}
            </DetailSection>
          </section>

          <aside className="space-y-4">
            <DetailSection title="Earnings">
              <div className="mb-3 flex items-center gap-2 text-sm font-black">
                <WalletCards className="size-4 text-[var(--lobb-clay)]" />
                Session breakdown
              </div>
              <PaymentRow label="Session fee" amount={booking.hourly_rate_ngn} />
              <PaymentRow label="LOBB fee" amount={booking.platform_fee_ngn} />
              <PaymentRow label="Total collected" amount={booking.total_amount_ngn} strong />
              {sessionRef && (
                <p className="mt-3 rounded-[10px] bg-[var(--lobb-bg-primary)] px-3 py-2 font-mono text-xs font-black tracking-wider text-[var(--lobb-text-secondary)]">
                  {sessionRef}
                </p>
              )}
            </DetailSection>

            {canCancel && (
              <section className="rounded-[18px] border border-[var(--lobb-error)]/30 bg-[var(--lobb-bg-elevated)] p-4">
                <p className="text-sm font-black">Need to cancel?</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-text-secondary)]">
                  Cancelling refunds the player and removes the session from both schedules.
                </p>
                <button
                  onClick={() => setShowCancel(true)}
                  className="mt-4 h-11 w-full rounded-[14px] border border-[var(--lobb-error)] text-sm font-black text-[var(--lobb-error)]"
                >
                  Cancel Session
                </button>
              </section>
            )}
          </aside>
        </div>

        {!canCancel && (
          <Link href="/coach/bookings" className="mt-5 inline-flex text-sm font-bold text-[var(--lobb-text-secondary)]">
            Back to bookings
          </Link>
        )}
      </section>

      {showCancel && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4"
          onClick={() => setShowCancel(false)}
        >
          <section
            className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black">Cancel this session?</h2>
              <button onClick={() => setShowCancel(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
              The player will receive a full refund. This booking will be removed from both schedules and the player will be notified by email.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--lobb-error)]">
              Repeated cancellations may affect your coach standing on LOBB.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancel(false)}
                className="h-12 rounded-[14px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]"
              >
                Keep Session
              </button>
              <button
                disabled={cancelling}
                onClick={cancelBooking}
                className="h-12 rounded-[14px] border border-[var(--lobb-error)] text-sm font-black text-[var(--lobb-error)] disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-text-tertiary)]">{title}</p>
      {children}
    </section>
  );
}

function PaymentRow({ amount, label, strong }: { amount: number; label: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between gap-5 py-1 text-sm ${strong ? "font-black text-[var(--lobb-text-primary)]" : "font-semibold text-[var(--lobb-text-secondary)]"}`}>
      <span>{label}</span>
      <span>{money(amount)}</span>
    </p>
  );
}
