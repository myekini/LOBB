import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { initiateRefund } from "@/lib/paystack";
import { sendDisputeResolvedEmails } from "@/lib/email-notifications";

type Resolution = "refund_player" | "release_to_coach" | "split";

/**
 * Resolve a dispute. Money consequences:
 * - refund_player:    full refund via Paystack; booking → cancelled.
 * - release_to_coach: booking → confirmed so the escrow cron completes it and
 *                     pays the coach on its next run.
 * - split:            refund player_refund_percent to the player, scale
 *                     coach_payout_ngn by coach_release_percent, then
 *                     booking → confirmed for the cron to pay out.
 */
export const POST = withRole("admin", async (request, auth, context) => {
  const { id } = context.params as { id: string };
  const body = (await request.json().catch(() => ({}))) as {
    resolution?: Resolution;
    player_refund_percent?: number;
    coach_release_percent?: number;
    internal_notes?: string;
  };

  if (!body.resolution || !["refund_player", "release_to_coach", "split"].includes(body.resolution)) {
    return NextResponse.json({ error: "resolution must be refund_player, release_to_coach, or split" }, { status: 400 });
  }

  const { data: dispute } = await auth.admin
    .from("disputes")
    .select("id, status, booking_id")
    .eq("id", id)
    .maybeSingle();

  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.status === "resolved") {
    return NextResponse.json({ error: "Dispute is already resolved" }, { status: 409 });
  }

  const { data: booking } = await auth.admin
    .from("bookings")
    .select(
      `id, booking_ref, player_id, coach_id, status, starts_at, total_amount_ngn, coach_payout_ngn,
       escrow_released_at, payments(paystack_reference, status),
       coaches!bookings_coach_id_fkey ( full_name ),
       players!bookings_player_id_fkey ( full_name )`
    )
    .eq("id", dispute.booking_id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const refundPercent =
    body.resolution === "refund_player" ? 100 :
    body.resolution === "split" ? Math.min(100, Math.max(0, Math.round(body.player_refund_percent ?? 50))) : 0;
  const releasePercent =
    body.resolution === "release_to_coach" ? 100 :
    body.resolution === "split" ? Math.min(100, Math.max(0, Math.round(body.coach_release_percent ?? 100 - refundPercent))) : 0;

  // ── Refund leg ────────────────────────────────────────────────────────────
  let refundError: string | null = null;
  const payment = booking.payments?.[0] as { paystack_reference?: string | null; status?: string | null } | undefined;
  if (refundPercent > 0) {
    if (payment?.status === "paid" && payment.paystack_reference) {
      try {
        await initiateRefund(
          payment.paystack_reference,
          refundPercent < 100
            ? Math.round((booking.total_amount_ngn ?? 0) * refundPercent) // (total × %/100) NGN × 100 kobo
            : undefined
        );
      } catch (err) {
        refundError = err instanceof Error ? err.message : "Refund failed";
      }
    } else {
      refundError = "No paid Paystack payment found to refund";
    }
  }

  // ── Coach payout leg ──────────────────────────────────────────────────────
  const bookingUpdate: Record<string, unknown> = {};
  if (releasePercent > 0) {
    // Hand the booking back to the escrow cron: it transitions
    // confirmed → completed and transfers coach_payout_ngn.
    bookingUpdate.status = "confirmed";
    if (releasePercent < 100) {
      bookingUpdate.coach_payout_ngn = Math.round(((booking.coach_payout_ngn ?? 0) * releasePercent) / 100);
    }
  } else {
    bookingUpdate.status = "cancelled";
    bookingUpdate.cancelled_by = "admin";
    bookingUpdate.cancelled_at = new Date().toISOString();
    bookingUpdate.cancellation_reason = "Dispute resolved in player's favour";
  }
  await auth.admin.from("bookings").update(bookingUpdate).eq("id", booking.id);

  // ── Mark the dispute resolved ─────────────────────────────────────────────
  const { error: updateError } = await auth.admin
    .from("disputes")
    .update({
      status: "resolved",
      resolution: body.resolution,
      player_refund_percent: refundPercent,
      coach_release_percent: releasePercent,
      internal_notes: body.internal_notes?.trim() || null,
      resolved_by: auth.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "dispute_resolved",
    target_table: "disputes",
    target_id: id,
    metadata: {
      booking_id: booking.id,
      resolution: body.resolution,
      player_refund_percent: refundPercent,
      coach_release_percent: releasePercent,
      refund_error: refundError,
    },
  });

  // Tell both parties the outcome in plain language. Never blocks the resolution.
  try {
    const [{ data: playerProfile }, { data: coachProfile }] = await Promise.all([
      auth.admin.from("profiles").select("id, email, email_notifications_enabled").eq("id", booking.player_id).maybeSingle(),
      auth.admin.from("profiles").select("id, email, email_notifications_enabled").eq("id", booking.coach_id).maybeSingle(),
    ]);
    const coachJoin = booking.coaches as { full_name: string | null } | { full_name: string | null }[] | null;
    const playerJoin = booking.players as { full_name: string | null } | { full_name: string | null }[] | null;
    await sendDisputeResolvedEmails(
      auth.admin,
      {
        bookingId: booking.id,
        humanRef: booking.booking_ref,
        coachName: (Array.isArray(coachJoin) ? coachJoin[0] : coachJoin)?.full_name ?? "Coach",
        playerName: (Array.isArray(playerJoin) ? playerJoin[0] : playerJoin)?.full_name ?? "Player",
        startsAt: booking.starts_at,
        category: "other",
      },
      body.resolution,
      refundPercent,
      playerProfile,
      coachProfile
    );
  } catch {
    // recorded in email_jobs; resolution already committed
  }

  return NextResponse.json({ ok: true, refund_error: refundError });
});
