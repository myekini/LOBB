import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { cancellationPolicy, refundAmountNgn } from "@/lib/lobb-money";
import { sendBookingCancelledEmails, sendRefundIssuedEmail } from "@/lib/email-notifications";
import { initiateRefund } from "@/lib/paystack";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["player", "coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string };

  const { data: booking, error: bookingError } = await auth.admin
    .from("bookings")
    .select(
      "id, coach_id, player_id, starts_at, ends_at, location, player_notes, status, total_amount_ngn, payments(paystack_reference, status), coaches!bookings_coach_id_fkey(full_name), players!bookings_player_id_fkey(full_name)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return NextResponse.json({ error: "Only pending or confirmed bookings can be cancelled" }, { status: 409 });
  }

  const isParticipant = booking.player_id === auth.user.id || booking.coach_id === auth.user.id;
  const isAdmin = auth.profile?.role === "admin";
  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cancelledBy = isAdmin ? "admin" : booking.player_id === auth.user.id ? "player" : "coach";
  const policy = cancellationPolicy(booking.starts_at, cancelledBy);
  const totalPaidNgn = booking.total_amount_ngn ?? 0;
  const refundNgn = refundAmountNgn(totalPaidNgn, policy.refundPercent);
  const payment = booking.payments?.[0] as { paystack_reference?: string | null; status?: string | null } | undefined;

  // ── Cancel booking in DB first (before touching Paystack) ────────────────────
  // If the DB update fails, no refund has been issued yet — consistent state.
  const now = new Date().toISOString();

  const { error: updateError } = await auth.admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: cancelledBy,
      cancelled_at: now,
      cancellation_reason: body.reason?.trim() || policy.note,
    })
    .eq("id", params.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // ── Issue refund via Paystack (booking already cancelled) ────────────────────
  if (policy.refundPercent > 0 && payment?.status === "paid" && payment.paystack_reference) {
    try {
      const refundKobo = policy.refundPercent === 100
        ? undefined                              // full refund — omit amount
        : Math.round(refundNgn * 100);           // partial — specify kobo amount

      await initiateRefund(payment.paystack_reference, refundKobo);

      const newPaymentStatus = policy.refundPercent === 100 ? "refunded" : "partial_refund";
      await auth.admin
        .from("payments")
        .update({ status: newPaymentStatus })
        .eq("paystack_reference", payment.paystack_reference);
    } catch (error) {
      // Booking is already cancelled. Refund failed — return error so the caller
      // knows to surface a "contact support" message, but don't re-activate the booking.
      return NextResponse.json(
        {
          ok: true,
          cancelled_by: cancelledBy,
          refund_percent: policy.refundPercent,
          refund_ngn: refundNgn,
          refund_label: policy.label,
          refund_error: error instanceof Error ? error.message : "Refund could not be started — contact support",
        },
        { status: 207 } // booking cancelled but refund requires manual action
      );
    }
  }

  // Fetch contact details for notifications
  const [coachProfile, playerProfile] = await Promise.all([
    auth.admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", booking.coach_id).single(),
    auth.admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", booking.player_id).single(),
  ]);

  // Build a clear refund summary for SMS
  const refundSummary = policy.refundPercent === 0
    ? policy.note
    : `${policy.label} of ₦${refundNgn.toLocaleString("en-NG")} will arrive in 5–7 business days. ${policy.note}`;

  await sendBookingCancelledEmails(
    auth.admin,
    {
      bookingId: booking.id,
      coachName: coachProfile.data?.full_name ?? "Your coach",
      playerName: playerProfile.data?.full_name ?? "Your player",
      startsAt: booking.starts_at,
      location: booking.location,
      playerNotes: booking.player_notes,
      reference: payment?.paystack_reference ?? booking.id,
      coachPhone: coachProfile.data?.phone_number ?? null,
      playerPhone: playerProfile.data?.phone_number ?? null,
      totalAmountNgn: totalPaidNgn,
      paymentStatus: payment?.status ?? null,
      paymentMethod: "Paystack",
    },
    playerProfile.data,
    coachProfile.data,
    cancelledBy,
    refundSummary
  ).catch(() => null);

  if (refundNgn > 0 && payment?.status === "paid") {
    sendRefundIssuedEmail(
      auth.admin,
      {
        bookingId: booking.id,
        coachName: coachProfile.data?.full_name ?? "Your coach",
        playerName: playerProfile.data?.full_name ?? "Your player",
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        location: booking.location,
        playerNotes: booking.player_notes,
        reference: payment?.paystack_reference ?? booking.id,
        coachPhone: coachProfile.data?.phone_number ?? null,
        playerPhone: playerProfile.data?.phone_number ?? null,
        totalAmountNgn: totalPaidNgn,
        paymentStatus: payment?.status ?? null,
        paymentMethod: "Paystack",
      },
      playerProfile.data,
      coachProfile.data,
      refundNgn,
      refundSummary
    ).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    cancelled_by: cancelledBy,
    refund_percent: policy.refundPercent,
    refund_ngn: refundNgn,
    refund_label: policy.label,
  });
}
