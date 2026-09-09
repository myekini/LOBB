import { formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { Card } from "@/components/ui/card";

export function BookingsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return <section className="space-y-2">{bookings.map((booking) => <Card key={booking.id} size="sm" variant="outlined" className="grid grid-cols-[1fr_auto] gap-3 p-3 text-sm"><span>{formatBookingDate(booking.starts_at)}</span><span className="font-medium tabular-nums">{money(booking.total_amount_ngn)}</span></Card>)}</section>;
}
