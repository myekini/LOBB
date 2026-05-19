import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("public_reviews")
    .select("*")
    .eq("coach_id", params.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
