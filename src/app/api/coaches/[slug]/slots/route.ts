import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AvailableSlot } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Resolve slug → coach id (must be active)
    const { data: coach, error: coachErr } = await admin
      .from("coaches")
      .select("id")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (coachErr) {
      return NextResponse.json({ error: coachErr.message }, { status: 500 });
    }
    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    // Call the DB function — window is today → today+14 days
    const { data, error } = await admin.rpc("get_coach_available_slots", {
      p_coach_id: coach.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slots: (data ?? []) as AvailableSlot[] });
  } catch {
    return NextResponse.json({ error: "Unable to load slots" }, { status: 500 });
  }
}
