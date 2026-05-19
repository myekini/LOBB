import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["player", "coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: booking, error } = await auth.admin
    .from("bookings")
    .select(
      "*, coaches!bookings_coach_id_fkey(full_name, slug, profile_photo_url, headline, primary_location), players!bookings_player_id_fkey(full_name), payments(status, paystack_reference, paid_at), reviews(id, rating, comment, removed_at)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isParticipant = booking.player_id === auth.user.id || booking.coach_id === auth.user.id;
  if (auth.profile?.role !== "admin" && !isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ booking });
}
