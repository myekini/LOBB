import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { sendPayoutProcessedEmail } from "@/lib/email-notifications";

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { coach_id?: string; booking_ids?: string[] };
  if (!body.coach_id) return NextResponse.json({ error: "coach_id is required" }, { status: 400 });

  let query = auth.admin
    .from("bookings")
    .select("id, coach_payout_ngn")
    .eq("coach_id", body.coach_id)
    .eq("status", "completed")
    .not("escrow_released_at", "is", null);

  if (Array.isArray(body.booking_ids) && body.booking_ids.length > 0) {
    query = query.in("id", body.booking_ids);
  }

  const { data: bookings, error: bookingError } = await query;
  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });

  const rows = bookings ?? [];
  if (rows.length === 0) return NextResponse.json({ error: "No payable bookings found" }, { status: 404 });

  const amount = rows.reduce((sum, booking) => sum + Math.max(0, booking.coach_payout_ngn), 0);
  const bookingIds = rows.map((booking) => booking.id);

  const { data: payout, error } = await auth.admin
    .from("payouts")
    .insert({
      coach_id: body.coach_id,
      amount_ngn: amount,
      session_count: rows.length,
      booking_ids: bookingIds,
      status: "processed",
      triggered_by: auth.user.id,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await auth.admin
    .from("profiles")
    .select("email, email_notifications_enabled")
    .eq("id", body.coach_id)
    .maybeSingle();

  if (profile?.email && profile.email_notifications_enabled !== false) {
    await sendPayoutProcessedEmail(auth.admin, body.coach_id, profile.email, amount, rows.length);
  }

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "manual_payout_triggered",
    target_table: "payouts",
    target_id: payout.id,
    metadata: { coach_id: body.coach_id, booking_ids: bookingIds, amount_ngn: amount },
  });

  return NextResponse.json({ ok: true, payout_id: payout.id, amount_ngn: amount });
}
