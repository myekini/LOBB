import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachPublicProfile } from "@/lib/types";

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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    return NextResponse.json({ coach: data as CoachPublicProfile });
  } catch {
    return NextResponse.json({ error: "Unable to load coach profile" }, { status: 500 });
  }
}
