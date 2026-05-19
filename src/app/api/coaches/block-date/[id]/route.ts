import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await auth.admin
    .from("coach_availability_blocks")
    .delete()
    .eq("id", params.id)
    .eq("coach_id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
