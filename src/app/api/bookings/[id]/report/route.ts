import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { sendDisputeOpenedEmails } from "@/lib/email-notifications";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Player/coach-facing issue reporting — the low-friction front door to
 * disputes. Reporting instantly freezes the coach payout (booking →
 * disputed) so the player never has to chase money that already left.
 * Admin resolves within the 48h SLA (see docs/flows/disputes.md).
 */

const CATEGORIES = [
  "coach_no_show",
  "player_no_show",
  "session_cut_short",
  "safety_concern",
  "other",
] as const;
type Category = (typeof CATEGORIES)[number];

const REPORT_WINDOW_HOURS = 72;

// ─── GET: dispute status for this booking (participants only) ────────────────

export const GET = withRole(["player", "coach", "admin"], async (_request, auth, context) => {
  const { id } = context.params as { id: string };

  const { data: booking } = await auth.admin
    .from("bookings")
    .select("id, player_id, coach_id")
    .eq("id", id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isParticipant = booking.player_id === auth.user.id || booking.coach_id === auth.user.id;
  if (!isParticipant && auth.profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: dispute } = await auth.admin
    .from("disputes")
    .select("id, status, reason, resolution, player_refund_percent, created_at, resolved_at")
    .eq("booking_id", id)
    .maybeSingle();

  return NextResponse.json({ dispute: dispute ?? null });
});

// ─── POST: report an issue ────────────────────────────────────────────────────
// Body: { category, description }

export const POST = withRole(["player", "coach"], async (request, auth, context) => {
  const { id } = context.params as { id: string };
  const body = (await request.json().catch(() => ({}))) as {
    category?: Category;
    description?: string;
  };

  const rl = rateLimit(`booking-report:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many reports. Try again in ${rl.retryAfterSecs}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  const category = body.category;
  const description = body.description?.trim() ?? "";
  if (!category || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Pick what went wrong" }, { status: 400 });
  }
  if (description.length < 10) {
    return NextResponse.json({ error: "Tell us a little more (at least 10 characters)" }, { status: 400 });
  }

  const { data: booking } = await auth.admin
    .from("bookings")
    .select(
      `id, booking_ref, player_id, coach_id, status, starts_at, ends_at, paystack_transfer_code,
       coaches!bookings_coach_id_fkey ( full_name ),
       players!bookings_player_id_fkey ( full_name )`
    )
    .eq("id", id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const isParticipant = booking.player_id === auth.user.id || booking.coach_id === auth.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["confirmed", "completed"].includes(booking.status)) {
    return NextResponse.json({ error: "Only confirmed or completed sessions can be reported" }, { status: 409 });
  }

  // Reports are accepted from session start until 72h after the session ends.
  const windowCloses = new Date(new Date(booking.ends_at).getTime() + REPORT_WINDOW_HOURS * 3600e3);
  if (new Date() > windowCloses) {
    return NextResponse.json(
      { error: "The reporting window for this session has closed. Contact support@lobb.ng and we'll look into it." },
      { status: 409 }
    );
  }

  // If the coach was already paid, freezing does nothing — route to support.
  if (booking.paystack_transfer_code) {
    return NextResponse.json(
      { error: "This session's payout has already been processed. Contact support@lobb.ng and we'll investigate." },
      { status: 409 }
    );
  }

  const reporterRole = booking.player_id === auth.user.id ? "player" : "coach";
  const reason = `[${category}] (reported by ${reporterRole}) ${description}`;

  const { data: dispute, error } = await auth.admin
    .from("disputes")
    .insert({ booking_id: booking.id, opened_by: auth.user.id, reason })
    .select("id, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "An issue has already been reported for this session — we're on it." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Freeze the payout while the dispute is open
  await auth.admin.from("bookings").update({ status: "disputed" }).eq("id", booking.id);

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "dispute_opened_by_user",
    target_table: "disputes",
    target_id: dispute.id,
    metadata: { booking_id: booking.id, category, reporter: reporterRole },
  });

  // Notify reporter (ack + SLA), the other party, and admins. Never blocks the report.
  try {
    const [{ data: playerProfile }, { data: coachProfile }] = await Promise.all([
      auth.admin.from("profiles").select("id, email, email_notifications_enabled").eq("id", booking.player_id).maybeSingle(),
      auth.admin.from("profiles").select("id, email, email_notifications_enabled").eq("id", booking.coach_id).maybeSingle(),
    ]);
    const coachJoin = booking.coaches as { full_name: string | null } | { full_name: string | null }[] | null;
    const playerJoin = booking.players as { full_name: string | null } | { full_name: string | null }[] | null;
    await sendDisputeOpenedEmails(
      auth.admin,
      {
        bookingId: booking.id,
        humanRef: booking.booking_ref,
        coachName: (Array.isArray(coachJoin) ? coachJoin[0] : coachJoin)?.full_name ?? "Coach",
        playerName: (Array.isArray(playerJoin) ? playerJoin[0] : playerJoin)?.full_name ?? "Player",
        startsAt: booking.starts_at,
        category,
      },
      description,
      reporterRole,
      playerProfile,
      coachProfile
    );
  } catch {
    // email failures are recorded in email_jobs; the report itself succeeded
  }

  return NextResponse.json({ ok: true, dispute });
});
