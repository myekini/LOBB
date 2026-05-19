import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

type Resolution = "refund_player" | "release_to_coach" | "split";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("admin");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => ({}))) as {
    resolution?: Resolution;
    player_refund_percent?: number;
    coach_release_percent?: number;
    internal_notes?: string;
  };

  const resolution = body.resolution ?? "release_to_coach";
  const playerPercent = resolution === "refund_player" ? 100 : resolution === "release_to_coach" ? 0 : Number(body.player_refund_percent);
  const coachPercent = resolution === "release_to_coach" ? 100 : resolution === "refund_player" ? 0 : Number(body.coach_release_percent);

  if (!Number.isInteger(playerPercent) || !Number.isInteger(coachPercent) || playerPercent + coachPercent !== 100) {
    return NextResponse.json({ error: "Resolution percentages must add up to 100" }, { status: 400 });
  }

  const { data: dispute, error } = await auth.admin
    .from("disputes")
    .upsert(
      {
        booking_id: params.id,
        reason: body.internal_notes?.trim() || "Resolved by admin",
        status: "resolved",
        resolution,
        player_refund_percent: playerPercent,
        coach_release_percent: coachPercent,
        internal_notes: body.internal_notes?.trim() || null,
        resolved_by: auth.user.id,
        resolved_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.admin.from("bookings").update({ status: "completed" }).eq("id", params.id);

  return NextResponse.json({ ok: true, dispute });
}
