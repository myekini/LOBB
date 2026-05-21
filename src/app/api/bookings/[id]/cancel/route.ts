import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { canCancelForFullRefund, cancellationPolicyNote } from "@/lib/lobb-money";
import { cancelledMessage } from "@/lib/notification-messages";
import { sendCancellationSmsBoth } from "@/lib/booking-sms";
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
      "id, coach_id, player_id, starts_at, ends_at, location, player_notes, status, payments(paystack_reference, status), coaches!bookings_coach_id_fkey(full_name), players!bookings_player_id_fkey(full_name)"
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
  const refundNote = cancellationPolicyNote(booking.starts_at);
  const fullRefund = canCancelForFullRefund(booking.starts_at);
  const payment = booking.payments?.[0] as { paystack_reference?: string | null; status?: string | null } | undefined;

  if (fullRefund && payment?.status === "paid" && payment.paystack_reference) {
    try {
      await initiateRefund(payment.paystack_reference);
      await auth.admin.from("payments").update({ status: "refunded" }).eq("paystack_reference", payment.paystack_reference);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Refund could not be started" },
        { status: 502 }
      );
    }
  }

  const now = new Date().toISOString();

  const { error: updateError } = await auth.admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_by: cancelledBy,
      cancelled_at: now,
      cancellation_reason: body.reason?.trim() || refundNote,
    })
    .eq("id", params.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const [coachProfile, playerProfile] = await Promise.all([
    auth.admin.from("profiles").select("phone_number, full_name").eq("id", booking.coach_id).single(),
    auth.admin.from("profiles").select("phone_number, full_name").eq("id", booking.player_id).single(),
  ]);

  const smsJobs: Array<Record<string, unknown>> = [];
  if (playerProfile.data?.phone_number) {
    smsJobs.push({
      type: "booking_cancelled_player",
      recipient_user_id: booking.player_id,
      recipient_phone: playerProfile.data.phone_number,
      booking_id: booking.id,
      coach_id: booking.coach_id,
      message: cancelledMessage(booking.starts_at, refundNote),
    });
  }
  if (coachProfile.data?.phone_number) {
    smsJobs.push({
      type: "booking_cancelled_coach",
      recipient_user_id: booking.coach_id,
      recipient_phone: coachProfile.data.phone_number,
      booking_id: booking.id,
      coach_id: booking.coach_id,
      message: cancelledMessage(booking.starts_at, refundNote),
    });
  }

  if (smsJobs.length > 0) {
    await auth.admin.from("sms_jobs").insert(smsJobs);
  }

  await sendCancellationSmsBoth(
    {
      coachName: coachProfile.data?.full_name ?? "Your coach",
      playerName: playerProfile.data?.full_name ?? "Your player",
      startsAt: booking.starts_at,
      location: booking.location,
      playerNotes: booking.player_notes,
      reference: payment?.paystack_reference ?? booking.id,
      coachPhone: coachProfile.data?.phone_number ?? null,
      playerPhone: playerProfile.data?.phone_number ?? null,
    },
    cancelledBy === "coach" ? "coach" : "player",
    refundNote
  ).catch(() => null);

  return NextResponse.json({ ok: true, refund_note: refundNote, refund_started: fullRefund && payment?.status === "paid" });
}
