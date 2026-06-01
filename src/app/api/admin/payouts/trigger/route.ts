import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createTransfer } from "@/lib/paystack";
import { sendPayoutProcessedEmail } from "@/lib/email-notifications";

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { coach_id?: string; booking_ids?: string[] };
  if (!body.coach_id) return NextResponse.json({ error: "coach_id is required" }, { status: 400 });

  // Get coach's Paystack recipient code
  const { data: coach, error: coachErr } = await auth.admin
    .from("coaches")
    .select("paystack_recipient_code")
    .eq("id", body.coach_id)
    .maybeSingle();

  if (coachErr) return NextResponse.json({ error: coachErr.message }, { status: 500 });
  if (!coach?.paystack_recipient_code) {
    return NextResponse.json({ error: "Coach has no Paystack transfer recipient configured" }, { status: 422 });
  }

  // Query completed bookings without a transfer yet
  let query = auth.admin
    .from("bookings")
    .select("id, paystack_reference, coach_payout_ngn")
    .eq("coach_id", body.coach_id)
    .eq("status", "completed")
    .not("escrow_released_at", "is", null)
    .is("paystack_transfer_code", null);

  if (Array.isArray(body.booking_ids) && body.booking_ids.length > 0) {
    query = query.in("id", body.booking_ids);
  }

  const { data: bookings, error: bookingError } = await query;
  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });

  const rows = bookings ?? [];
  if (rows.length === 0) return NextResponse.json({ error: "No payable bookings found" }, { status: 404 });

  const totalAmount = rows.reduce((sum, b) => sum + Math.max(0, b.coach_payout_ngn), 0);
  const bookingIds = rows.map((b) => b.id);

  // Execute individual transfers per booking
  const transferResults = await Promise.allSettled(
    rows.map(async (b) => {
      const transfer = await createTransfer({
        amount_kobo: Math.round(b.coach_payout_ngn * 100),
        recipient_code: coach.paystack_recipient_code!,
        reference: b.paystack_reference ? `${b.paystack_reference}-payout` : undefined,
        reason: "LOBB session payout",
      });
      await auth.admin
        .from("bookings")
        .update({ paystack_transfer_code: transfer.transfer_code })
        .eq("id", b.id);
    })
  );

  const succeeded = transferResults.filter((r) => r.status === "fulfilled").length;
  const failed = transferResults.filter((r) => r.status === "rejected").length;

  const { data: payout, error } = await auth.admin
    .from("payouts")
    .insert({
      coach_id: body.coach_id,
      amount_ngn: totalAmount,
      session_count: rows.length,
      booking_ids: bookingIds,
      status: failed === 0 ? "processed" : "partial",
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
    await sendPayoutProcessedEmail(auth.admin, body.coach_id, profile.email, totalAmount, rows.length);
  }

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "manual_payout_triggered",
    target_table: "payouts",
    target_id: payout.id,
    metadata: { coach_id: body.coach_id, booking_ids: bookingIds, amount_ngn: totalAmount, succeeded, failed },
  });

  return NextResponse.json({ ok: true, payout_id: payout.id, amount_ngn: totalAmount, succeeded, failed });
}
