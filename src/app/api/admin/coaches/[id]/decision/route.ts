import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";
import { sendCoachDecisionEmail } from "@/lib/email-notifications";

type DecisionAction = "approve" | "reject" | "suspend" | "unsuspend";

const MAX_REJECTIONS = 3;

export const POST = withRole("admin", async (request, auth, context) => {
  const { id } = context.params as { id: string };

  const body = (await request.json().catch(() => ({}))) as {
    action?: DecisionAction;
    reason?: string;
  };
  const action = body.action;
  const reason = body.reason?.trim() || null;

  if (!action || !["approve", "reject", "suspend", "unsuspend"].includes(action)) {
    return NextResponse.json({ error: "Invalid coach decision action" }, { status: 400 });
  }
  if ((action === "reject" || action === "suspend") && !reason) {
    return NextResponse.json({ error: "A written reason is required" }, { status: 400 });
  }

  let newRejectionCount = 0;
  let needsDirectContact = false;

  if (action === "reject") {
    const { data: current } = await auth.admin
      .from("coaches")
      .select("rejection_count")
      .eq("id", id)
      .maybeSingle();

    newRejectionCount = (current?.rejection_count ?? 0) + 1;
    needsDirectContact = newRejectionCount >= MAX_REJECTIONS;
  }

  const update =
    action === "approve"
      ? { status: "active", is_verified: true, approved_at: new Date().toISOString(), rejection_reason: null }
      : action === "reject"
        ? {
            status: "rejected",
            is_verified: false,
            rejection_reason: reason,
            rejection_count: newRejectionCount,
            needs_direct_contact: needsDirectContact,
          }
        : action === "suspend"
          ? { status: "suspended", suspended_at: new Date().toISOString(), suspended_reason: reason }
          : { status: "active", suspended_at: null, suspended_reason: null };

  const { data: coach, error } = await auth.admin
    .from("coaches")
    .update(update)
    .eq("id", id)
    .select("id, full_name")
    .maybeSingle();

  if (error) return internalError(error);
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: `coach_${action}`,
    target_table: "coaches",
    target_id: id,
    reason,
  });

  const { data: profile } = await auth.admin
    .from("profiles")
    .select("email, email_notifications_enabled")
    .eq("id", id)
    .maybeSingle();

  if ((action === "approve" || action === "reject") && profile?.email && profile.email_notifications_enabled !== false) {
    await sendCoachDecisionEmail(auth.admin, id, profile.email, action, reason, needsDirectContact);
  }

  return NextResponse.json({ ok: true, coach, needs_direct_contact: needsDirectContact });
});
