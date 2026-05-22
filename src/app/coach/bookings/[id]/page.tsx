"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Circle, MapPin, Phone, User, X } from "lucide-react";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
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
      <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 text-[var(--lobb-black)]">
        <CoachFlowHeader title="Booking" eyebrow="Loading" />
        <section className="mx-auto max-w-md pt-5">
          <BookingCardSkeleton />
          <div className="mt-7 space-y-4">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 text-[var(--lobb-black)]">
        <CoachFlowHeader title="Booking" eyebrow="Not found" />
        <section className="mx-auto max-w-md pt-5">
          <h1 className="text-xl font-black">Booking not found</h1>
          <Link href="/coach/bookings" className="mt-5 block text-sm font-black text-[var(--lobb-clay)]">Back to bookings</Link>
        </section>
      </main>
    );
  }

  const player = firstJoin(booking.players);
  const payment = booking.payments?.[0];
  const isConfirmed = booking.status === "confirmed";
  const sessionInFuture = new Date(booking.starts_at).getTime() > Date.now();
  const canCancel = isConfirmed && sessionInFuture;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Booking Detail" eyebrow="Coach schedule" actionHref="/coach/bookings" actionLabel="List" />
      <section className="mx-auto max-w-md pt-5">

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${isConfirmed ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"}`}>
          <Circle className="size-2 fill-current" />
          {booking.status}
        </span>

        <h2 className="mt-5 text-[22px] font-black">{formatBookingDate(booking.starts_at)}</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">
          {durationMinutes(booking.starts_at, booking.ends_at)} minutes · {money(booking.total_amount_ngn)} session
        </p>

        <DetailSection title="Player">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
              <User className="size-5" />
            </div>
            <div>
              <p className="font-black">{player?.full_name ?? "Player"}</p>
              {booking.player_notes && (
                <p className="mt-1 text-sm font-medium italic text-[var(--lobb-muted)]">&quot;{booking.player_notes}&quot;</p>
              )}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm font-black text-[var(--lobb-muted)]">
            <Phone className="size-4 text-[var(--lobb-clay)]" />
            Player phone appears in your booking confirmation SMS
          </p>
        </DetailSection>

        <DetailSection title="Location">
          <p className="flex items-start gap-2 text-sm font-semibold text-[var(--lobb-muted)]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
            {booking.location || "Location not specified"}
          </p>
        </DetailSection>

        <DetailSection title="Your Earnings">
          <PaymentRow label="Session fee (player pays)" amount={booking.hourly_rate_ngn} />
          <PaymentRow label="LOBB platform fee" amount={booking.platform_fee_ngn} />
          <PaymentRow label="Total collected" amount={booking.total_amount_ngn} strong />
          <p className="mt-3 text-xs font-bold text-[var(--lobb-muted)]">Ref: {payment?.paystack_reference ?? booking.id}</p>
        </DetailSection>

        {/* Cancel — only available for upcoming confirmed sessions */}
        {canCancel && (
          <>
            <div className="mt-8 rounded-[18px] border border-[#f1d2c1] bg-[#fff7f2] p-4">
              <p className="text-sm font-black text-[var(--lobb-black)]">Need to cancel?</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Cancelling this session will send the player a full refund (5–7 business days) and remove the booking from both your schedules.
              </p>
            </div>
            <button
              onClick={() => setShowCancel(true)}
              className="mt-4 h-14 w-full rounded-full border border-red-300 bg-transparent text-sm font-black text-red-700"
            >
              Cancel This Session
            </button>
          </>
        )}

        <Link href="/coach/bookings" className="mt-5 block text-center text-sm font-bold text-[var(--lobb-muted)]">
          Back to My Bookings
        </Link>
      </section>

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4"
          onClick={() => setShowCancel(false)}
        >
          <section
            className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_44px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black">Cancel this session?</h2>
              <button onClick={() => setShowCancel(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-muted)]">
              The player will receive a <strong>full refund</strong> — this booking will be removed from both schedules and the player will be notified by WhatsApp.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--lobb-error)]">
              Repeated cancellations may affect your coach standing on LOBB.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancel(false)}
                className="h-12 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white"
              >
                Keep Session
              </button>
              <button
                disabled={cancelling}
                onClick={cancelBooking}
                className="h-12 rounded-full border border-red-300 text-sm font-black text-red-700 disabled:opacity-60"
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
    <section className="mt-7 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">{title}</p>
      {children}
    </section>
  );
}

function PaymentRow({ amount, label, strong }: { amount: number; label: string; strong?: boolean }) {
  return (
    <p className={`flex justify-between gap-5 py-1 text-sm ${strong ? "font-black text-[var(--lobb-black)]" : "font-semibold text-[var(--lobb-muted)]"}`}>
      <span>{label}</span>
      <span>{money(amount)}</span>
    </p>
  );
}
