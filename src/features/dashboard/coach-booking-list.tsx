import { BookingCard } from "@/components/common/booking-card";
import type { DashboardBooking } from "@/lib/dashboard-client-types";

export function CoachBookingList({ bookings }: { bookings: DashboardBooking[] }) {
  return <section className="space-y-3">{bookings.map((booking) => <BookingCard key={booking.id} booking={booking} href={`/coach/bookings/${booking.id}`} />)}</section>;
}
