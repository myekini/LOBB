import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("player");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) return NextResponse.json({ error: "Dispute reason is required" }, { status: 400 });

  const { data: booking, error: bookingError } = await auth.admin
    .from("bookings")
    .select("id, player_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.player_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["confirmed", "completed"].includes(booking.status)) {
    return NextResponse.json({ error: "Only confirmed or completed bookings can be disputed" }, { status: 409 });
  }

  const { data: dispute, error } = await auth.admin
    .from("disputes")
    .upsert(
      {
        booking_id: params.id,
        opened_by: auth.user.id,
        reason,
        status: "open",
      },
      { onConflict: "booking_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.admin.from("bookings").update({ status: "disputed" }).eq("id", params.id);

  return NextResponse.json({ dispute });
}
