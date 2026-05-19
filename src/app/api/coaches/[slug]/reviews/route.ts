import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const admin = createAdminClient();

  const { data: coach, error: coachError } = await admin
    .from("coaches")
    .select("id")
    .eq("slug", params.slug)
    .eq("status", "active")
    .maybeSingle();

  if (coachError) return NextResponse.json({ error: coachError.message }, { status: 500 });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  const { data, error } = await admin
    .from("public_reviews")
    .select("*")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
