import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole(["coach", "admin"], async (_request, auth) => {
  const { data, error } = await auth.admin
    .from("public_reviews")
    .select("id, rating, comment, player_first_name, created_at")
    .eq("coach_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return internalError(error);

  const reviews = data ?? [];
  const count = reviews.length;
  const average_rating = count
    ? Number((reviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / count).toFixed(1))
    : null;

  return NextResponse.json({
    summary: { average_rating, review_count: count },
    reviews,
  });
});
