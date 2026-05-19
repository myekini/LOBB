"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Circle, MapPin, Phone } from "lucide-react";
import { getBookingDay, getCoachBooking, money } from "@/lib/mock-data";

export default function CoachBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const booking = getCoachBooking(params.id);
  const isConfirmed = booking.status === "confirmed";

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-7 flex items-center gap-3">
          <Link href="/coach/bookings" className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-black">Booking Detail</h1>
        </header>

        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${isConfirmed ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"}`}>
          <Circle className="size-2 fill-current" />
          {booking.status}
        </span>

        <h2 className="mt-5 text-[22px] font-black">{getBookingDay(booking.day).short} · {booking.time}</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{money(booking.amount)} session</p>

        <section className="mt-7 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={booking.playerAvatar} alt="" className="size-14 rounded-full object-cover" />
            <div>
              <p className="font-black">{booking.playerName}</p>
              {booking.note && <p className="mt-1 text-sm font-medium italic text-[var(--lobb-muted)]">&quot;{booking.note}&quot;</p>}
            </div>
          </div>
          <div className="mt-5 space-y-3 border-t border-[var(--lobb-border)] pt-4 text-sm font-semibold text-[var(--lobb-muted)]">
            <a href={`tel:${booking.playerPhone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-[var(--lobb-black)]">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              {booking.playerPhone}
            </a>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-[var(--lobb-clay)]" />
              {booking.location}
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
