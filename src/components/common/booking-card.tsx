import Link from "next/link";
import { formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { StatusBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";

export function BookingCard({ booking, href }: { booking: DashboardBooking; href: string }) {
  return (
    <Card as="article" variant="outlined" className="p-4">
      <p className="font-medium">{formatBookingDate(booking.starts_at)}</p>
      <p className="mt-1 text-sm font-medium text-[var(--lobb-text-secondary)]">{booking.location}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <StatusBadge status={booking.status} />
        <span className="text-sm font-medium">{money(booking.total_amount_ngn)}</span>
      </div>
      <Link href={href} className="mt-4 flex h-10 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] text-xs font-medium transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)]">
        View details
      </Link>
    </Card>
  );
}
