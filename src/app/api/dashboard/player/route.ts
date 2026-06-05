import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";
import { canLeaveReview, loadPlayerBookings } from "@/lib/dashboard-queries";

export const GET = withRole("player", async (_request, auth) => {
  const { data, error } = await loadPlayerBookings(auth.admin, auth.user.id);
  if (error) return internalError(error);

  const now = Date.now();
  const visibleUpcomingStatuses = new Set(["confirmed", "pending", "pending_payment"]);
  const bookings = (data ?? []).map((booking) => ({
    ...booking,
    is_upcoming: new Date(booking.starts_at).getTime() >= now && visibleUpcomingStatuses.has(booking.status),
    can_leave_review: canLeaveReview(booking),
    coach_phone_visible: booking.payments?.[0]?.status === "paid",
  }));

  return NextResponse.json({
    upcoming: bookings.filter((b) => b.is_upcoming),
    past: bookings.filter((b) => !b.is_upcoming),
  });
});
