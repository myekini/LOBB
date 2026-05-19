import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { coachApprovedMessage, coachRejectedMessage } from "@/lib/notification-messages";
import { sendOtpSms } from "@/lib/sms";

type DecisionAction = "approve" | "reject" | "suspend" | "unsuspend";

const MAX_REJECTIONS = 3;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  // For rejection, fetch current rejection count first
  let newRejectionCount = 0;
  let needsDirectContact = false;

  if (action === "reject") {
    const { data: current } = await auth.admin
      .from("coaches")
      .select("rejection_count")
      .eq("id", params.id)
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
    .eq("id", params.id)
    .select("id, full_name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: `coach_${action}`,
    target_table: "coaches",
    target_id: params.id,
    reason,
  });

  const { data: profile } = await auth.admin
    .from("profiles")
    .select("phone_number")
    .eq("id", params.id)
    .maybeSingle();

  if (profile?.phone_number) {
    const message =
      action === "approve"
        ? coachApprovedMessage()
        : action === "reject"
          ? coachRejectedMessage(reason!, needsDirectContact)
          : null;

    if (message) {
      await auth.admin.from("sms_jobs").insert({
        type: action === "approve" ? "coach_approved" : "coach_rejected",
        recipient_user_id: params.id,
        recipient_phone: profile.phone_number,
        coach_id: params.id,
        message,
      });
      await sendOtpSms({ phone: profile.phone_number, message }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, coach, needs_direct_contact: needsDirectContact });
}
