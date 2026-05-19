import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

type Resolution = "refund_player" | "release_to_coach" | "split";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    resolution?: Resolution;
    player_refund_percent?: number;
    coach_release_percent?: number;
    internal_notes?: string;
  };

  if (!body.resolution || !["refund_player", "release_to_coach", "split"].includes(body.resolution)) {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  }

  const playerPercent =
    body.resolution === "refund_player" ? 100 : body.resolution === "release_to_coach" ? 0 : Number(body.player_refund_percent);
  const coachPercent =
    body.resolution === "release_to_coach" ? 100 : body.resolution === "refund_player" ? 0 : Number(body.coach_release_percent);

  if (!Number.isInteger(playerPercent) || !Number.isInteger(coachPercent) || playerPercent + coachPercent !== 100) {
    return NextResponse.json({ error: "Resolution percentages must add up to 100" }, { status: 400 });
  }

  const { data: dispute, error } = await auth.admin
    .from("disputes")
    .update({
      status: "resolved",
      resolution: body.resolution,
      player_refund_percent: playerPercent,
      coach_release_percent: coachPercent,
      internal_notes: body.internal_notes?.trim() || null,
      resolved_by: auth.user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("id, booking_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  await auth.admin.from("bookings").update({ status: "completed" }).eq("id", dispute.booking_id);
  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "dispute_resolved",
    target_table: "disputes",
    target_id: params.id,
    metadata: { player_refund_percent: playerPercent, coach_release_percent: coachPercent },
  });

  return NextResponse.json({ ok: true, dispute });
}
