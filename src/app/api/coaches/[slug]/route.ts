// PUBLIC ROUTE — no authentication required
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalError } from "@/lib/api-response";
import type { CoachPublicProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("coach_profiles_public")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (error) return internalError(error);
    if (!data) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

    return NextResponse.json(
      { coach: data as CoachPublicProfile },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json({ error: "Unable to load coach profile" }, { status: 500 });
  }
}
