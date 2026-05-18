"use client";

import Link from "next/link";
import { useState } from "react";
import { Circle, MapPin } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { LobbEmptyState } from "@/components/lobb-empty-state";
import { coachBookings, getBookingDay, money, type CoachBooking } from "@/lib/mock-data";

type BookingTab = "confirmed" | "completed" | "cancelled";

const tabs: Array<{ value: BookingTab; label: string }> = [
  { value: "confirmed", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Canc." },
];

export default function CoachBookingsPage() {
  const [tab, setTab] = useState<BookingTab>("confirmed");
  const bookings = coachBookings.filter((booking) => booking.status === tab);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">My Bookings</h1>

        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          {tabs.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`h-11 rounded-[14px] text-sm font-black transition ${
                tab === item.value ? "bg-[var(--lobb-black)] text-white shadow-[0_8px_18px_rgba(13,13,13,0.18)]" : "text-[var(--lobb-muted)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="mt-6 space-y-4">
          {bookings.length ? (
            bookings.map((booking) => (
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

function CoachBookingCard({ booking }: { booking: CoachBooking }) {
  const isConfirmed = booking.status === "confirmed";

  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
      <p className="text-[15px] font-black">{getBookingDay(booking.day).short} · {booking.time}</p>

      <div className="mt-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={booking.playerAvatar} alt="" className="size-12 rounded-full object-cover" />
        <div>
          <p className="font-black">{booking.playerName}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--lobb-muted)]">
            <MapPin className="size-3.5 text-[var(--lobb-clay)]" />
            {booking.location}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[var(--lobb-border)] pt-4">
        <p className="text-sm font-black">{money(booking.amount)}</p>
        <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
          isConfirmed ? "bg-[#e8f4ed] text-[var(--lobb-success)]" : "bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]"
        }`}>
          <Circle className="size-2 fill-current" />
          {isConfirmed ? "Confirmed" : booking.status}
        </p>
      </div>

      <Link href={`/coach/bookings/${booking.id}`} className="mt-5 flex h-10 w-full items-center justify-center rounded-full border border-[var(--lobb-border)] text-xs font-black">
        View Details
      </Link>
    </article>
  );
}
