"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Circle, MapPin, Phone, User } from "lucide-react";
import { BookingCardSkeleton } from "@/components/lobb-skeleton";
import { showLobbToast } from "@/components/lobb-global-state";
import {
  durationMinutes,
  firstJoin,
  formatBookingDate,
  money,
  type DashboardBooking,
} from "@/lib/dashboard-client-types";
import { CoachFlowHeader } from "@/components/coach-flow-header";

export default function CoachBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);

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
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [params.id]);

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

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Booking Detail" eyebrow="Coach schedule" actionHref="/coach/bookings" actionLabel="List" />
      <section className="mx-auto max-w-md pt-5">

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${isConfirmed ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"}`}>
          <Circle className="size-2 fill-current" />
          {booking.status}
        </span>

        <h2 className="mt-5 text-[22px] font-black">{formatBookingDate(booking.starts_at)}</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{durationMinutes(booking.starts_at, booking.ends_at)} minutes · {money(booking.total_amount_ngn)} session</p>

        <DetailSection title="Player">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
              <User className="size-5" />
            </div>
            <div>
              <p className="font-black">{player?.full_name ?? "Player"}</p>
              {booking.player_notes && <p className="mt-1 text-sm font-medium italic text-[var(--lobb-muted)]">&quot;{booking.player_notes}&quot;</p>}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm font-black text-[var(--lobb-muted)]">
            <Phone className="size-4 text-[var(--lobb-clay)]" />
            Player phone appears in booking confirmation SMS
          </p>
        </DetailSection>

        <DetailSection title="Location">
          <p className="flex items-start gap-2 text-sm font-semibold text-[var(--lobb-muted)]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
            {booking.location || "Location not specified"}
          </p>
        </DetailSection>

        <DetailSection title="Payment">
          <PaymentRow amount={booking.hourly_rate_ngn} label="Session fee" />
          <PaymentRow amount={booking.platform_fee_ngn} label="Convenience fee" />
          <PaymentRow amount={booking.total_amount_ngn} label="Total paid" strong />
          <p className="mt-3 text-xs font-bold text-[var(--lobb-muted)]">Ref: {payment?.paystack_reference ?? booking.paystack_reference ?? booking.id}</p>
        </DetailSection>
      </section>
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
