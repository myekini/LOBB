import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireRole(["coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.admin
    .from("public_reviews")
    .select("id, rating, comment, player_first_name, created_at")
    .eq("coach_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reviews = data ?? [];
  const count = reviews.length;
  const average_rating = count
    ? Number((reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / count).toFixed(1))
    : null;

  return NextResponse.json({
    summary: { average_rating, review_count: count },
    reviews,
  });
}
