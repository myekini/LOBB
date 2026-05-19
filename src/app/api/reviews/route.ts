import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireRole("player");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    booking_id?: string;
    rating?: number;
    comment?: string;
  };

  const rating = Number(body.rating);
  const comment = body.comment?.trim() || null;

  if (!body.booking_id) return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  if (comment && comment.length > 200) {
    return NextResponse.json({ error: "Review comment must be 200 characters or fewer" }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await auth.admin
    .from("bookings")
    .select("id, coach_id, player_id, status, starts_at")
    .eq("id", body.booking_id)
    .eq("player_id", auth.user.id)
    .maybeSingle();

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "completed") {
    return NextResponse.json({ error: "Reviews require a completed booking" }, { status: 403 });
  }
  if (new Date(booking.starts_at).getTime() + 2 * 60 * 60 * 1000 > Date.now()) {
    return NextResponse.json({ error: "Reviews unlock 2 hours after session start" }, { status: 403 });
  }

  const { data, error } = await auth.admin
    .from("reviews")
    .insert({
      booking_id: booking.id,
      coach_id: booking.coach_id,
      player_id: auth.user.id,
      rating,
      comment,
    })
    .select("id")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.code === "23505" ? "Review already submitted" : error.message }, { status });
  }

  return NextResponse.json({ ok: true, review_id: data.id });
}
