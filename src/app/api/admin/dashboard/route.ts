import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [metrics, coaches, bookings] = await Promise.all([
    auth.admin.from("admin_core_metrics").select("*").maybeSingle(),
    auth.admin.from("coaches").select("*").eq("status", "pending_review").order("created_at").limit(5),
    auth.admin
      .from("bookings")
      .select("*, coaches!bookings_coach_id_fkey(full_name, slug, profile_photo_url), players!bookings_player_id_fkey(id, full_name), payments(status, paystack_reference)")
      .order("starts_at", { ascending: false })
      .limit(8),
  ]);

  for (const result of [metrics, coaches, bookings]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  const recentBookings = bookings.data ?? [];
  const playerIds = Array.from(new Set(recentBookings.map((booking) => booking.player_id).filter(Boolean)));
  const avatarsByPlayerId = new Map<string, string | null>();

  if (playerIds.length > 0) {
    const { data: profiles, error } = await auth.admin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", playerIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const profile of profiles ?? []) {
      avatarsByPlayerId.set(profile.id, profile.avatar_url);
    }
  }

  const bookingsWithPlayerAvatars = recentBookings.map((booking) => {
    const avatarUrl = avatarsByPlayerId.get(booking.player_id) ?? null;
    const players = Array.isArray(booking.players)
      ? booking.players.map((player: { id: string; full_name: string }) => ({ ...player, avatar_url: avatarUrl }))
      : booking.players
        ? { ...booking.players, avatar_url: avatarUrl }
        : booking.players;

    return { ...booking, players };
  });

  return NextResponse.json({
    metrics: metrics.data,
    pending_coach_approvals: coaches.data ?? [],
    recent_bookings: bookingsWithPlayerAvatars,
  });
}
