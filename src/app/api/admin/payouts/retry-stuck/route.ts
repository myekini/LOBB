import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";
import { createTransfer } from "@/lib/paystack";

// Retries Paystack transfers for all completed bookings where the automated
// cron transfer failed (paystack_transfer_code IS NULL after payout hold release).
export const POST = withRole("admin", async (_request, auth) => {
  const { data: stuck, error: fetchErr } = await auth.admin
    .from("bookings")
    .select("id, paystack_reference, coach_payout_ngn, coach_id, transfer_last_error")
    .eq("status", "completed")
    .not("escrow_released_at", "is", null)
    .is("paystack_transfer_code", null)
    .gt("coach_payout_ngn", 0);

  if (fetchErr) return internalError(fetchErr);

  const toRetry = (stuck ?? []).filter((b) => b.coach_payout_ngn != null);

  if (toRetry.length === 0) {
    return NextResponse.json({ ok: true, retried: 0, succeeded: 0, failed: 0 });
  }

  // Batch-fetch coach recipient codes
  const coachIds = Array.from(new Set(toRetry.map((b) => b.coach_id)));
  const { data: coaches, error: coachErr } = await auth.admin
    .from("coaches")
    .select("id, paystack_recipient_code")
    .in("id", coachIds);

  if (coachErr) return internalError(coachErr);

  const recipientMap = new Map(
    (coaches ?? []).map((c) => [c.id, c.paystack_recipient_code as string | null])
  );

  const results = await Promise.allSettled(
    toRetry
      .filter((b) => recipientMap.get(b.coach_id))
      .map(async (b) => {
        const recipientCode = recipientMap.get(b.coach_id)!;
        try {
          const transfer = await createTransfer({
            amount_kobo: Math.round(b.coach_payout_ngn * 100),
            recipient_code: recipientCode,
            reference: b.paystack_reference ? `${b.paystack_reference}-payout` : undefined,
            reason: "LOBB session payout (admin retry)",
          });
          await auth.admin
            .from("bookings")
            .update({ paystack_transfer_code: transfer.transfer_code, transfer_last_error: null })
            .eq("id", b.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await auth.admin
            .from("bookings")
            .update({ transfer_last_error: message })
            .eq("id", b.id);
          throw err;
        }
      })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  await auth.admin.from("admin_audit_log").insert({
    admin_id: auth.user.id,
    action: "retry_stuck_payouts",
    target_table: "bookings",
    metadata: { retried: toRetry.length, succeeded, failed },
  });

  return NextResponse.json({ ok: true, retried: toRetry.length, succeeded, failed });
});
