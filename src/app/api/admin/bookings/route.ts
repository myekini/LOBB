import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

const VALID_STATUSES = new Set(["pending", "confirmed", "completed", "cancelled", "disputed"]);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const GET = withRole("admin", async (request, auth) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const coachId = url.searchParams.get("coach_id");
  const playerId = url.searchParams.get("player_id");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  // Cursor-based pagination: ?cursor=<starts_at ISO> points to the last row's starts_at
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT))));

  let query = auth.admin
    .from("bookings")
    .select(
      "*, coaches!bookings_coach_id_fkey(full_name, slug), players!bookings_player_id_fkey(full_name), payments(status, paystack_reference)"
    )
    .order("starts_at", { ascending: false })
    .limit(limit);

  const effectiveStatus = status && VALID_STATUSES.has(status) ? status : null;
  if (effectiveStatus) query = query.eq("status", effectiveStatus);
  if (coachId) query = query.eq("coach_id", coachId);
  if (playerId) query = query.eq("player_id", playerId);
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lte("starts_at", to);
  if (cursor) query = query.lt("starts_at", cursor);

  // Totals for the whole filter/range (not just the loaded page). Only needed on
  // the first page — the client keeps it while paginating.
  const summaryPromise = (async () => {
    if (cursor) return null;
    try {
      const { data } = await auth.admin.rpc("admin_bookings_summary", {
        p_status: effectiveStatus,
        p_from: from,
        p_to: to,
      });
      return Array.isArray(data) ? data[0] ?? null : data;
    } catch {
      // migration not applied yet → page falls back to loaded counts
      return null;
    }
  })();

  const [{ data, error }, summary] = await Promise.all([query, summaryPromise]);
  if (error) return internalError(error);

  const rows = data ?? [];

  // Attach each player's avatar so the ledger's PersonCell can render a photo
  // (bookings.players only carries full_name). Mirrors /api/admin/dashboard.
  const playerIds = Array.from(new Set(rows.map((b) => b.player_id).filter(Boolean)));
  const avatarByPlayerId = new Map<string, string | null>();
  if (playerIds.length > 0) {
    const { data: profiles, error: profileError } = await auth.admin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", playerIds);
    if (profileError) return internalError(profileError);
    for (const profile of profiles ?? []) avatarByPlayerId.set(profile.id, profile.avatar_url);
  }

  const bookings = rows.map((booking) => {
    const avatar_url = avatarByPlayerId.get(booking.player_id) ?? null;
    const players = Array.isArray(booking.players)
      ? booking.players.map((p: { full_name: string }) => ({ ...p, avatar_url }))
      : booking.players
        ? { ...booking.players, avatar_url }
        : booking.players;
    return { ...booking, players };
  });

  const nextCursor = bookings.length === limit ? rows[rows.length - 1]?.starts_at ?? null : null;

  return NextResponse.json({ bookings, next_cursor: nextCursor, limit, summary });
});
