import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

// Player directory for the admin lookup page. Aggregation lives in the
// admin_player_directory view; this route just returns a bounded, ordered page.
// "spend" is completed sessions only — confirmed-but-not-completed money can
// still be refunded via a dispute.

// MVP-scale cap. The page counts/searches the returned set client-side; revisit
// with real pagination before the player base approaches this.
const LIMIT = 500;

export const GET = withRole("admin", async (request, auth) => {
  const q = new URL(request.url).searchParams.get("q")?.trim();

  let query = auth.admin
    .from("admin_player_directory")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (q) {
    const term = q.replace(/[%,]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone_number.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return internalError(error);

  const players = (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone_number: p.phone_number,
    avatar_url: p.avatar_url ?? null,
    created_at: p.created_at,
    referred_by_coach_id: p.referred_by_coach_id,
    stats: {
      bookings: p.booking_count ?? 0,
      completed: p.completed_count ?? 0,
      spend: p.spend_ngn ?? 0,
      last: p.last_session_at ?? null,
    },
  }));

  return NextResponse.json({ players });
});
