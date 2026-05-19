import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) return NextResponse.json({ error: "Removal reason is required" }, { status: 400 });

  const { error } = await auth.admin
    .from("reviews")
    .update({
      removed_at: new Date().toISOString(),
      removed_by: auth.user.id,
      removal_reason: reason,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "review_removed",
    target_table: "reviews",
    target_id: params.id,
    reason,
  });

  return NextResponse.json({ ok: true });
}
