"use client";

import { useMemo, useState } from "react";
import { Circle } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { adminBookings, money, type AdminBookingStatus } from "@/lib/mock-data";

type Filter = "all" | AdminBookingStatus;

const filters: Filter[] = ["all", "confirmed", "completed", "disputed", "cancelled"];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const bookings = useMemo(() => adminBookings.filter((booking) => filter === "all" || booking.status === filter), [filter]);

  return (
    <AdminShell active="All Bookings">
      <h1 className="text-2xl font-black">All Bookings</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`h-10 rounded-full px-4 text-sm font-black capitalize ${filter === item ? "bg-[var(--lobb-black)] text-white" : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"}`}>
            {item === "all" ? "All" : item}
          </button>
        ))}
      </div>

      <section className="mt-6 space-y-3">
        {bookings.map((booking) => (
          <article key={booking.id} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)] md:grid md:grid-cols-[180px_1fr_auto] md:items-center md:gap-6">
            <div>
              <p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id}</p>
              <p className="mt-1 text-sm font-black">{booking.date}</p>
            </div>
            <p className="mt-3 w-fit rounded-[12px] bg-[var(--lobb-bg)] px-3 py-2 text-sm font-black md:mt-0">{booking.coach} ← {booking.player}</p>
            <div className="mt-3 flex items-center justify-between gap-4 md:mt-0 md:justify-end">
              <p className="inline-flex items-center gap-2 text-sm font-black capitalize">
                <Circle className={`size-2 fill-current ${statusColor(booking.status)}`} />
                {booking.status}
              </p>
              <p className="font-black">{money(booking.amount)}</p>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

function statusColor(status: AdminBookingStatus) {
  if (status === "confirmed") return "text-[var(--lobb-clay)]";
  if (status === "disputed") return "text-[#F4A228]";
  if (status === "cancelled") return "text-red-700";
  return "text-[var(--lobb-muted)]";
}
