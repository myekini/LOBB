"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Circle, MapPin, Phone, X } from "lucide-react";
import { getBookingDay, getCoach, getPlayerBooking, money } from "@/lib/mock-data";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showCancel, setShowCancel] = useState(false);
  const booking = getPlayerBooking(params.id);
  const coach = getCoach(booking.coachSlug);
  const day = getBookingDay(booking.day);
  const isUpcoming = booking.status === "confirmed";

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-7 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black">Booking Detail</h1>
        </header>

        <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f4ed] px-3 py-1.5 text-xs font-black text-[var(--lobb-success)]">
          <Circle className="size-2 fill-current" />
          Confirmed
        </span>

        <h2 className="mt-5 text-[22px] font-black">{day.short} · {booking.time}</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{booking.durationMinutes} minutes · {money(booking.total)} paid</p>

        <DetailSection title="Coach">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coach.photo} alt="" className="size-14 rounded-full object-cover" />
            <div>
              <p className="font-black">{coach.name}</p>
              <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.subtitle} · {coach.locations[0]}</p>
            </div>
          </div>
          <a href="tel:08123456789" className="mt-4 flex items-center gap-2 text-sm font-black">
            <Phone className="size-4 text-[var(--lobb-clay)]" />
            0812 345 6789
          </a>
        </DetailSection>

        <DetailSection title="Location">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--lobb-muted)]">
            <MapPin className="size-4 text-[var(--lobb-clay)]" />
            {booking.location || "Location not specified"}
          </p>
        </DetailSection>

        {booking.note && (
          <DetailSection title="Your Note to Coach">
            <p className="text-sm font-medium leading-6 text-[var(--lobb-muted)]">&quot;{booking.note}&quot;</p>
          </DetailSection>
        )}

        <DetailSection title="Payment">
          <PaymentRow amount={booking.sessionFee} label="Session fee" />
          <PaymentRow amount={booking.lobbFee} label="LOBB fee" />
          <PaymentRow amount={booking.total} label="Total paid" strong />
          <p className="mt-3 text-xs font-bold text-[var(--lobb-muted)]">Ref: {booking.reference}</p>
        </DetailSection>

        <DetailSection title="Cancellation Policy">
          <p className="text-sm font-semibold leading-6 text-[var(--lobb-muted)]">Free cancellation until {booking.cancellationCutoff}</p>
        </DetailSection>

        {isUpcoming && (
          <button onClick={() => setShowCancel(true)} className="mt-8 h-14 w-full rounded-full border border-red-300 bg-transparent text-sm font-black text-red-700">
            Cancel Booking
          </button>
        )}

        <Link href="/dashboard" className="mt-5 block text-center text-sm font-bold text-[var(--lobb-muted)]">
          Back to My Bookings
        </Link>
      </section>

      {showCancel && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4" onClick={() => setShowCancel(false)}>
          <section className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_44px_rgba(0,0,0,0.2)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-black">Cancel this booking?</h2>
              <button onClick={() => setShowCancel(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-muted)]">
              Since it&apos;s more than 24hrs before your session, you&apos;ll receive a full refund.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancel(false)} className="h-12 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white">
                Keep Booking
              </button>
              <button onClick={() => setShowCancel(false)} className="h-12 rounded-full border border-red-300 text-sm font-black text-red-700">
                Yes, Cancel
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
    <section className="mt-7">
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
