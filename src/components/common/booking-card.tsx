import Link from "next/link";
import { formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { StatusBadge } from "@/components/common/status-badge";

export function BookingCard({ booking, href }: { booking: DashboardBooking; href: string }) {
  return (
    <article className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
      <p className="font-black">{formatBookingDate(booking.starts_at)}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{booking.location}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge status={booking.status} />
        <span className="text-sm font-black">{money(booking.total_amount_ngn)}</span>
      </div>
      <Link href={href} className="mt-4 flex h-10 items-center justify-center rounded-full border border-[var(--lobb-border)] text-xs font-black">
        View Details
      </Link>
    </article>
  );
}
