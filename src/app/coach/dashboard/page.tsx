"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Circle, MapPin, Phone, User } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { coachBookings, getBookingDay, money } from "@/lib/mock-data";

function LobbMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="17" r="7" fill="currentColor" />
    </svg>
  );
}

export default function CoachDashboardPage() {
  const upcoming = coachBookings.filter((booking) => booking.status === "confirmed");
  const nextSession = upcoming[0];
  const weeklyEarnings = upcoming.reduce((total, booking) => total + booking.amount, 0);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <LobbMark />
          <span className="text-[13px] font-black tracking-[0.22em]">LOBB</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]" aria-label="Notifications">
            <Bell className="size-4" />
          </button>
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
            <User className="size-4 text-[var(--lobb-muted)]" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-md px-5 pt-5">
        <Link href="/coach/profile" className="flex items-center justify-between rounded-[18px] border border-[var(--lobb-border)] border-l-4 border-l-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <div>
            <p className="flex items-center gap-2 text-sm font-black">
              <AlertTriangle className="size-4 text-[var(--lobb-clay)]" />
              Profile 65% complete
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Complete to go live →</p>
          </div>
        </Link>

        <h1 className="mt-8 text-lg font-black">This Week</h1>
        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <Stat value={String(upcoming.length)} label="Sessions Upcoming" />
          <Stat value={money(weeklyEarnings)} label="Earnings This Week" bordered />
          <Stat value="2" label="New Requests" bordered />
        </div>

        <h2 className="mt-8 text-base font-black">Next Session</h2>
        <section className="mt-3 overflow-hidden rounded-[24px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
          <p className="text-sm font-black">{getBookingDay(nextSession.day).short} · {nextSession.time}</p>

          <div className="mt-6 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nextSession.playerAvatar} alt="" className="size-14 rounded-full object-cover" />
            <div>
              <p className="text-lg font-black">{nextSession.playerName}</p>
              {nextSession.note && <p className="mt-1 text-sm font-medium italic text-white/55">&quot;{nextSession.note}&quot;</p>}
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm font-semibold text-white/80">
            <a href={`tel:${nextSession.playerPhone.replace(/\s/g, "")}`} className="flex items-center gap-3">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              {nextSession.playerPhone}
            </a>
            <p className="flex items-center gap-3">
              <MapPin className="size-4 text-[var(--lobb-clay)]" />
              {nextSession.location}
            </p>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-base font-black">All Bookings</h2>
          <Link href="/coach/bookings" className="text-xs font-black text-[var(--lobb-clay)]">See all →</Link>
        </div>
        <section className="mt-3 space-y-3">
          {coachBookings.slice(0, 3).map((booking) => (
            <CompactBookingRow key={booking.id} booking={booking} />
          ))}
        </section>
      </section>

      <CoachBottomNav active="home" />
    </main>
  );
}

function Stat({ value, label, bordered }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border)]" : ""}`}>
      <p className="truncate text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.1em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}

function CompactBookingRow({ booking }: { booking: (typeof coachBookings)[number] }) {
  return (
    <article className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
      <div className="rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-bg)] px-2 py-1 text-center">
        <p className="text-[10px] font-black uppercase text-[var(--lobb-muted)]">{booking.day}</p>
        <p className="text-[11px] font-black text-[var(--lobb-clay)]">{booking.time.replace(":00 ", "")}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{booking.playerShortName}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">
          <Circle className={`size-2 fill-current ${booking.status === "confirmed" ? "text-[var(--lobb-success)]" : "text-[var(--lobb-muted)]"}`} />
          {booking.status}
        </p>
      </div>
      <p className="text-sm font-black">{money(booking.amount)}</p>
    </article>
  );
}
