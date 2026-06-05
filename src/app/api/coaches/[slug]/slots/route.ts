// PUBLIC ROUTE — no authentication required
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalError } from "@/lib/api-response";
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

    const { data: coach, error: coachErr } = await admin
      .from("coaches")
      .select("id, status")
      .eq("slug", slug)
      .maybeSingle();

    if (coachErr) return internalError(coachErr);
    if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    if (coach.status !== "active") return NextResponse.json({ slots: [], status: coach.status });

    const { data, error } = await admin.rpc("get_coach_available_slots", { p_coach_id: coach.id });

    if (error) return internalError(error);

    return NextResponse.json({ slots: (data ?? []) as AvailableSlot[] });
  } catch {
    return NextResponse.json({ error: "Unable to load slots" }, { status: 500 });
  }
}
