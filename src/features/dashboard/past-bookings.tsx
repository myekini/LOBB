import { BookingCard } from "@/components/common/booking-card";
import type { DashboardBooking } from "@/lib/dashboard-client-types";

export function PastBookings({ bookings }: { bookings: DashboardBooking[] }) {
  return <section className="space-y-3">{bookings.map((booking) => <BookingCard key={booking.id} booking={booking} href={`/dashboard/bookings/${booking.id}`} />)}</section>;
}
