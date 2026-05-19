import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    blocked_date?: string;
    date?: string;
    reason?: string;
  };
  const blockedDate = body.blocked_date ?? body.date;

  if (!blockedDate || !/^\d{4}-\d{2}-\d{2}$/.test(blockedDate)) {
    return NextResponse.json({ error: "blocked_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("coach_availability_blocks")
    .upsert(
      {
        coach_id: auth.user.id,
        blocked_date: blockedDate,
        reason: body.reason?.trim() || null,
      },
      { onConflict: "coach_id,blocked_date" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ block: data });
}
