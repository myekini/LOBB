import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const { data, error } = await admin.rpc("get_coach_available_slots", {
    p_coach_id: params.id,
    p_from_date: from || undefined,
    p_to_date: to || undefined,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data ?? [] });
}
