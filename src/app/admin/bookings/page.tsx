"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";

type Filter = "all" | "pending" | "confirmed" | "completed" | "disputed" | "cancelled";

const filters: Filter[] = ["all", "pending", "confirmed", "completed", "disputed", "cancelled"];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const query = filter === "all" ? "" : `?status=${filter}`;
    setLoading(true);
    fetchWithCache<{ bookings: DashboardBooking[] }>(`lobb.admin.bookings.${filter}`, `/api/admin/bookings${query}`)
      .then((payload) => {
        if (alive) setBookings(payload.bookings ?? []);
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
  }, [filter]);

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
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, index) => <BookingCardSkeleton key={index} />)}
          </>
        ) : bookings.map((booking) => (
          <article key={booking.id} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)] md:grid md:grid-cols-[180px_1fr_auto] md:items-center md:gap-6">
            <div>
              <p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id}</p>
              <p className="mt-1 text-sm font-black">{formatBookingDate(booking.starts_at)}</p>
            </div>
            <p className="mt-3 w-fit rounded-[12px] bg-[var(--lobb-bg)] px-3 py-2 text-sm font-black md:mt-0">
              {firstJoin(booking.coaches)?.full_name ?? "Coach"} ← {firstJoin(booking.players)?.full_name ?? "Player"}
            </p>
            <div className="mt-3 flex items-center justify-between gap-4 md:mt-0 md:justify-end">
              <p className="inline-flex items-center gap-2 text-sm font-black capitalize">
                <Circle className={`size-2 fill-current ${statusColor(booking.status)}`} />
                {booking.status}
              </p>
              <p className="font-black">{money(booking.total_amount_ngn)}</p>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

function statusColor(status: string) {
  if (status === "confirmed") return "text-[var(--lobb-clay)]";
  if (status === "disputed") return "text-[#F4A228]";
  if (status === "cancelled") return "text-red-700";
  return "text-[var(--lobb-muted)]";
}
