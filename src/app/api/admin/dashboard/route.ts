import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole("admin", async (_request, auth) => {
  const [metrics, coaches, bookings, stuckTransfers] = await Promise.all([
    auth.admin.from("admin_core_metrics").select("*").maybeSingle(),
    auth.admin.from("coaches").select("*").eq("status", "pending_review").order("created_at").limit(5),
    auth.admin
      .from("bookings")
      .select("*, coaches!bookings_coach_id_fkey(full_name, slug, profile_photo_url), players!bookings_player_id_fkey(id, full_name), payments(status, paystack_reference)")
      .order("starts_at", { ascending: false })
      .limit(8),
    auth.admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .not("escrow_released_at", "is", null)
      .is("paystack_transfer_code", null),
  ]);

  if (metrics.error) return internalError(metrics.error);
  if (coaches.error) return internalError(coaches.error);
  if (bookings.error) return internalError(bookings.error);
  if (stuckTransfers.error) return internalError(stuckTransfers.error);

  const recentBookings = bookings.data ?? [];
  const playerIds = Array.from(new Set(recentBookings.map((b) => b.player_id).filter(Boolean)));
  const avatarsByPlayerId = new Map<string, string | null>();

  if (playerIds.length > 0) {
    const { data: profiles, error } = await auth.admin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", playerIds);

    if (error) return internalError(error);
    for (const profile of profiles ?? []) {
      avatarsByPlayerId.set(profile.id, profile.avatar_url);
    }
  }

  const bookingsWithPlayerAvatars = recentBookings.map((booking) => {
    const avatarUrl = avatarsByPlayerId.get(booking.player_id) ?? null;
    const players = Array.isArray(booking.players)
      ? booking.players.map((p: { id: string; full_name: string }) => ({ ...p, avatar_url: avatarUrl }))
      : booking.players
        ? { ...booking.players, avatar_url: avatarUrl }
        : booking.players;
    return { ...booking, players };
  });

  return NextResponse.json({
    metrics: metrics.data,
    pending_coach_approvals: coaches.data ?? [],
    recent_bookings: bookingsWithPlayerAvatars,
    stuck_payouts: stuckTransfers.count ?? 0,
  });
});
