import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const DELETE = withRole("admin", async (request, auth, context) => {
  const { id } = context.params as { id: string };

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
    .eq("id", id);

  if (error) return internalError(error);

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "review_removed",
    target_table: "reviews",
    target_id: id,
    reason,
  });

  return NextResponse.json({ ok: true });
});
