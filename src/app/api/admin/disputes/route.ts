import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";

// ─── GET: list disputes with booking + party context ─────────────────────────

export const GET = withRole("admin", async (_request, auth) => {
  const { data: disputes, error } = await auth.admin
    .from("disputes")
    .select(
      `id, booking_id, reason, status, resolution, player_refund_percent,
       coach_release_percent, internal_notes, created_at, resolved_at,
       bookings (
         id, booking_ref, starts_at, location, status, total_amount_ngn, coach_payout_ngn,
         coaches!bookings_coach_id_fkey ( full_name ),
         players!bookings_player_id_fkey ( full_name )
       )`
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ disputes: disputes ?? [] });
});

// ─── POST: open a dispute on a booking ────────────────────────────────────────
// Body: { booking_id, reason }

export const POST = withRole("admin", async (request, auth) => {
  const body = (await request.json().catch(() => ({}))) as { booking_id?: string; reason?: string };
  const reason = body.reason?.trim();
  if (!body.booking_id || !reason) {
    return NextResponse.json({ error: "booking_id and reason are required" }, { status: 400 });
  }

  const { data: booking } = await auth.admin
    .from("bookings")
    .select("id, status, escrow_released_at")
    .eq("id", body.booking_id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!["confirmed", "completed"].includes(booking.status)) {
    return NextResponse.json({ error: "Only confirmed or completed bookings can be disputed" }, { status: 409 });
  }

  const { data: dispute, error } = await auth.admin
    .from("disputes")
    .insert({ booking_id: booking.id, opened_by: auth.user.id, reason })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505" ? "This booking already has a dispute" : error.message;
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }

  // Freeze the booking so the payout cron skips it while the dispute is open
  await auth.admin.from("bookings").update({ status: "disputed" }).eq("id", booking.id);

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "dispute_opened",
    target_table: "disputes",
    target_id: dispute.id,
    metadata: { booking_id: booking.id, reason },
  });

  return NextResponse.json({ ok: true, dispute_id: dispute.id });
});
