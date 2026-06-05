// PUBLIC ROUTE — no authentication required
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalError } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const admin = createAdminClient();

  const { data: coach, error: coachError } = await admin
    .from("coaches")
    .select("id")
    .or(`slug.eq.${params.slug},id.eq.${params.slug}`)
    .eq("status", "active")
    .maybeSingle();

  if (coachError) return internalError(coachError);
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const { data, error } = await admin
    .from("public_reviews")
    .select("*")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return internalError(error);
  return NextResponse.json({ reviews: data ?? [] });
}
