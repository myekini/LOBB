import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { canLeaveReview, loadPlayerBookings } from "@/lib/dashboard-queries";

export async function GET() {
  const auth = await requireRole("player");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await loadPlayerBookings(auth.admin, auth.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const visibleUpcomingStatuses = new Set(["confirmed", "pending", "pending_payment"]);
  const bookings = (data ?? []).map((booking) => ({
    ...booking,
    is_upcoming: new Date(booking.starts_at).getTime() >= now && visibleUpcomingStatuses.has(booking.status),
    can_leave_review: canLeaveReview(booking),
    coach_phone_visible: booking.payments?.[0]?.status === "paid",
  }));

  return NextResponse.json({
    upcoming: bookings.filter((booking) => booking.is_upcoming),
    past: bookings.filter((booking) => !booking.is_upcoming),
  });
}
