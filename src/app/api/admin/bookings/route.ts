import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

const statuses = new Set(["pending", "confirmed", "completed", "cancelled", "disputed"]);

export async function GET(request: Request) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const coachId = url.searchParams.get("coach_id");
  const playerId = url.searchParams.get("player_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = auth.admin
    .from("bookings")
    .select(
      "*, coaches!bookings_coach_id_fkey(full_name, slug), players!bookings_player_id_fkey(full_name), payments(status, paystack_reference)"
    )
    .order("starts_at", { ascending: false });

  if (status && statuses.has(status)) query = query.eq("status", status);
  if (coachId) query = query.eq("coach_id", coachId);
  if (playerId) query = query.eq("player_id", playerId);
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("starts_at", to);

  const { data, error } = await query.limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data ?? [] });
}
