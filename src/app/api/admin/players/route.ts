import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";

// List all players with booking activity for the admin lookup page.

export const GET = withRole("admin", async (_request, auth) => {
  const [{ data: profiles, error }, { data: bookings }] = await Promise.all([
    auth.admin
      .from("profiles")
      .select("id, full_name, email, phone_number, created_at, referred_by_coach_id")
      .eq("role", "player")
      .order("created_at", { ascending: false }),
    auth.admin
      .from("bookings")
      .select("player_id, status, total_amount_ngn, starts_at"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats = new Map<string, { bookings: number; completed: number; spend: number; last: string | null }>();
  for (const b of bookings ?? []) {
    const entry = stats.get(b.player_id) ?? { bookings: 0, completed: 0, spend: 0, last: null };
    entry.bookings += 1;
    if (b.status === "completed") entry.completed += 1;
    if (b.status === "completed" || b.status === "confirmed") entry.spend += b.total_amount_ngn ?? 0;
    if (!entry.last || b.starts_at > entry.last) entry.last = b.starts_at;
    stats.set(b.player_id, entry);
  }

  const players = (profiles ?? []).map((p) => ({
    ...p,
    stats: stats.get(p.id) ?? { bookings: 0, completed: 0, spend: 0, last: null },
  }));

  return NextResponse.json({ players });
});
