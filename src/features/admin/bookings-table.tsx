import { formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";

export function BookingsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return <section className="space-y-2">{bookings.map((booking) => <div key={booking.id} className="grid grid-cols-[1fr_auto] rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 text-sm"><span className="font-black">{formatBookingDate(booking.starts_at)}</span><span className="font-black">{money(booking.total_amount_ngn)}</span></div>)}</section>;
}
