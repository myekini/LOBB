"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Circle, CreditCard, MapPin, MessageCircle, Phone, ReceiptText, ShieldCheck, X } from "lucide-react";
import { showLobbToast } from "@/providers/lobb-global-state";
import {
  durationMinutes,
  firstJoin,
  formatBookingDate,
  money,
  type DashboardBooking,
} from "@/lib/dashboard-client-types";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { cancellationPolicy } from "@/lib/lobb-money";

function firstProfilePhone(value: DashboardBooking["coach_profile"]) {
  const profile = firstJoin(value);
  return profile?.phone_number ?? null;
}

function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showCancel, setShowCancel] = useState(false);
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const coach = firstJoin(booking?.coaches);

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

  const cancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by player from dashboard" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to cancel booking");
      showLobbToast({ type: "success", message: "Booking cancelled." });
      router.push("/dashboard");
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to cancel booking" });
    } finally {
      setCancelling(false);
      setShowCancel(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] px-4 pb-10 pt-5 text-[var(--lobb-black)] sm:px-6 lg:pt-8">
        <section className="mx-auto max-w-5xl">
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
      <main className="min-h-screen bg-[var(--lobb-bg)] px-4 py-10 text-[var(--lobb-black)] sm:px-6">
        <section className="mx-auto max-w-3xl">
          <h1 className="text-xl font-black">Booking not found</h1>
          <Link href="/dashboard" className="mt-5 block text-sm font-black text-[var(--lobb-clay)]">Back to bookings</Link>
        </section>
      </main>
    );
  }

  const payment = booking.payments?.[0];
  const isUpcoming = booking.status === "confirmed";
  const coachPhone = payment?.status === "paid" ? firstProfilePhone(booking.coach_profile) : null;
  const policy = cancellationPolicy(booking.starts_at, "player");
  const fullRefund = policy.refundPercent === 100;
  const policyNote = policy.note;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-4 pb-10 pt-5 text-[var(--lobb-black)] sm:px-6 lg:pt-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-7 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link href="/dashboard/bookings" className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_8px_22px_rgba(13,13,13,0.05)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-center font-black">Booking Detail</h1>
          <div aria-hidden="true" />
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f4ed] px-3 py-1.5 text-xs font-black text-[var(--lobb-success)]">
              <Circle className="size-2 fill-current" />
              {booking.status}
            </span>

            <section className="mt-5 overflow-hidden rounded-[28px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_46px_rgba(13,13,13,0.18)] sm:p-6">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
                Session
              </p>
              <h2 className="mt-3 text-[27px] font-black leading-none sm:text-[36px]">{formatBookingDate(booking.starts_at)}</h2>
              <p className="mt-3 text-sm font-semibold text-white/58">
                {durationMinutes(booking.starts_at, booking.ends_at)} minutes · {money(booking.total_amount_ngn)} paid
              </p>
            </section>

            <DetailSection title="Coach">
              <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coach?.profile_photo_url || "/favicon.svg"} alt="" className="size-14 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="font-black">{coach?.full_name ?? "Coach"}</p>
              <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach?.headline || coach?.primary_location || booking.location}</p>
              {coach?.slug && (
                <Link href={`/coaches/${coach.slug}`} className="mt-0.5 inline-block text-xs font-semibold text-[var(--lobb-clay)] hover:underline">
                  View profile →
                </Link>
              )}
            </div>
          </div>
          {coachPhone ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${coachPhone.replace(/\s/g, "")}`} className="flex h-11 items-center justify-center gap-2 rounded-[15px] bg-[var(--lobb-black)] text-xs font-black text-white">
                <Phone className="size-4" /> Call
              </a>
              <a href={`https://wa.me/${toWhatsAppNumber(coachPhone)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[15px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-xs font-black">
                <MessageCircle className="size-4 text-[var(--lobb-clay)]" /> WhatsApp
              </a>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm font-black text-[var(--lobb-muted)]">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              Coach phone unlocks after payment
            </p>
          )}
            </DetailSection>

            <DetailSection title="Location">
              <p className="flex items-start gap-2 text-sm font-semibold text-[var(--lobb-muted)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                {booking.location || "Location not specified"}
              </p>
            </DetailSection>

            {booking.player_notes && (
              <DetailSection title="Your Note to Coach">
                <p className="text-sm font-medium leading-6 text-[var(--lobb-muted)]">&quot;{booking.player_notes}&quot;</p>
              </DetailSection>
            )}
          </div>

          <aside className="rounded-[28px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 shadow-[0_14px_34px_rgba(13,13,13,0.06)] lg:sticky lg:top-6">
        <DetailSection title="Payment" compact>
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">
            <CreditCard className="size-4 text-[var(--lobb-clay)]" />
            {payment?.status ?? "pending"}
          </p>
          <PaymentRow amount={booking.hourly_rate_ngn} label="Session fee" />
          <PaymentRow amount={booking.platform_fee_ngn} label="Convenience fee" />
          <PaymentRow amount={booking.total_amount_ngn} label="Total paid" strong />
          <p className="mt-3 break-all text-xs font-bold text-[var(--lobb-muted)]">Ref: {payment?.paystack_reference ?? booking.id}</p>
        </DetailSection>

        <DetailSection title="Cancellation Policy">
          <div className={`rounded-[20px] border p-4 ${fullRefund ? "border-[#cfe7d8] bg-[#eef8f2]" : policy.refundPercent === 50 ? "border-[#ffe0b2] bg-[#fff7f2]" : "border-[#f1d2c1] bg-[#fff0ee]"}`}>
            <p className="flex items-start gap-2 text-sm font-black">
              <ShieldCheck className="mt-0.5 size-4 text-[var(--lobb-clay)]" />
              {policy.label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">{policyNote}</p>
          </div>
        </DetailSection>

        {isUpcoming && (
          <button onClick={() => setShowCancel(true)} className="mt-8 h-14 w-full rounded-full border border-red-300 bg-transparent text-sm font-black text-red-700">
            Cancel Booking
          </button>
        )}

        <Link href="/dashboard" className="mt-5 block text-center text-sm font-bold text-[var(--lobb-muted)]">
          Back to My Bookings
        </Link>
        <Link href={`/dashboard/bookings/${booking.id}/receipt`} className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black">
          <ReceiptText className="size-4 text-[var(--lobb-clay)]" />
          View Receipt
        </Link>
          </aside>
        </div>
      </section>

      {showCancel && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4" onClick={() => setShowCancel(false)}>
          <section className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_44px_rgba(0,0,0,0.2)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black">Cancel this booking?</h2>
              <button onClick={() => setShowCancel(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-muted)]">
              <strong>{policy.label}.</strong> {policyNote}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancel(false)} className="h-12 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white">
                Keep Booking
              </button>
              <button disabled={cancelling} onClick={cancelBooking} className="h-12 rounded-full border border-red-300 text-sm font-black text-red-700 disabled:opacity-60">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function DetailSection({ title, children, compact }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={compact ? "" : "mt-7"}>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">{title}</span>
        <span className="h-px flex-1 bg-[var(--lobb-border)]" />
      </div>
      {children}
    </section>
  );
}

function PaymentRow({ amount, label, strong }: { amount: number; label: string; strong?: boolean }) {
  return (
    <p className={`flex gap-5 py-1 text-sm ${strong ? "font-black text-[var(--lobb-black)]" : "font-semibold text-[var(--lobb-muted)]"}`}>
      <span className="w-24 text-[var(--lobb-black)]">{money(amount)}</span>
      <span>{label}</span>
    </p>
  );
}
