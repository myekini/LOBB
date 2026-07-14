import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  adminPendingDigestEmail,
  bookingCancelledEmail,
  bookingConfirmedCoachEmail,
  bookingConfirmedPlayerEmail,
  bookingReminderEmail,
  coachDecisionEmail,
  paymentFailedEmail,
  paymentReceiptEmail,
  payoutProcessedEmail,
  refundIssuedEmail,
  reviewRequestEmail,
  disputeOpenedAdminEmail,
  disputeOpenedOtherPartyEmail,
  disputeOpenedReporterEmail,
  disputeResolvedEmail,
  type DisputeEmailInfo,
  type EmailBookingInfo,
} from "@/lib/email-templates";

type EmailProfile = {
  email: string | null;
  email_notifications_enabled?: boolean | null;
};

type EmailProfileWithId = EmailProfile & {
  id?: string | null;
};

type EmailJobInput = {
  type: string;
  recipient_user_id?: string;
  recipient_email: string;
  booking_id?: string;
  coach_id?: string;
  review_id?: string;
  scheduled_for?: string;
  template: {
    subject: string;
    preview: string;
    html: string;
    text: string;
  };
  status?: "pending" | "sent" | "failed" | "cancelled";
  provider_message_id?: string | null;
  error_message?: string | null;
};

type EmailJobRecord = {
  id: string;
};

function canEmail(profile: EmailProfileWithId | null | undefined): profile is EmailProfileWithId & { email: string } {
  return Boolean(profile?.email && profile.email_notifications_enabled !== false);
}

function insertEmailJob(admin: SupabaseClient, input: EmailJobInput) {
  return admin.from("email_jobs").insert({
    type: input.type,
    recipient_user_id: input.recipient_user_id,
    recipient_email: input.recipient_email,
    subject: input.template.subject,
    preview: input.template.preview,
    html: input.template.html,
    text: input.template.text,
    booking_id: input.booking_id,
    coach_id: input.coach_id,
    review_id: input.review_id,
    scheduled_for: input.scheduled_for,
    status: input.status ?? "pending",
    provider_message_id: input.provider_message_id,
    error_message: input.error_message,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
    failed_at: input.status === "failed" ? new Date().toISOString() : null,
  });
}

async function sendAndRecord(admin: SupabaseClient, input: EmailJobInput) {
  const { data: job, error: reserveError } = await insertEmailJob(admin, {
    ...input,
    status: "cancelled",
    error_message: "Reserved for immediate send",
  }).select("id").maybeSingle<EmailJobRecord>();

  if (reserveError) {
    if (reserveError.code === "23505") return;
    throw reserveError;
  }

  if (!job?.id) return;

  try {
    const result = await sendEmail({
      to: input.recipient_email,
      subject: input.template.subject,
      preview: input.template.preview,
      html: input.template.html,
      text: input.template.text,
    });
    await admin
      .from("email_jobs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        failed_at: null,
        provider_message_id: result?.id ?? null,
        error_message: null,
      })
      .eq("id", job.id);
  } catch (error) {
    await admin
      .from("email_jobs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Email failed",
      })
      .eq("id", job.id);
  }
}

export async function sendBookingConfirmedEmails(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null
) {
  const sends: Promise<unknown>[] = [];

  if (canEmail(playerProfile) && playerProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "booking_confirmed_player",
        recipient_user_id: playerProfile.id ?? undefined,
        recipient_email: playerProfile.email,
        booking_id: info.bookingId,
        coach_id: coachProfile?.id ?? undefined,
        template: bookingConfirmedPlayerEmail(info),
      })
    );
  }

  if (canEmail(coachProfile) && coachProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "booking_confirmed_coach",
        recipient_user_id: coachProfile.id ?? undefined,
        recipient_email: coachProfile.email,
        booking_id: info.bookingId,
        coach_id: coachProfile.id ?? undefined,
        template: bookingConfirmedCoachEmail(info),
      })
    );
  }

  await Promise.allSettled(sends);
}

export async function sendPaymentReceiptEmail(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null
) {
  if (!canEmail(playerProfile) || !playerProfile.email) return;

  await sendAndRecord(admin, {
    type: "booking_payment_receipt_player",
    recipient_user_id: playerProfile.id ?? undefined,
    recipient_email: playerProfile.email,
    booking_id: info.bookingId,
    coach_id: coachProfile?.id ?? undefined,
    template: paymentReceiptEmail(info),
  });
}

export async function sendPaymentFailedEmail(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null
) {
  if (!canEmail(playerProfile) || !playerProfile.email) return;

  await sendAndRecord(admin, {
    type: "payment_failed_player",
    recipient_user_id: playerProfile.id ?? undefined,
    recipient_email: playerProfile.email,
    booking_id: info.bookingId,
    coach_id: coachProfile?.id ?? undefined,
    template: paymentFailedEmail(info),
  });
}

export async function queueBookingReminderEmails(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null,
  reminderAt: string,
  reviewAt: string
) {
  const jobs: EmailJobInput[] = [];

  if (canEmail(playerProfile) && playerProfile.email) {
    jobs.push({
      type: "booking_24h_reminder_player",
      recipient_user_id: playerProfile.id ?? undefined,
      recipient_email: playerProfile.email,
      booking_id: info.bookingId,
      coach_id: coachProfile?.id ?? undefined,
      scheduled_for: reminderAt,
      template: bookingReminderEmail(info, "player"),
    });
    jobs.push({
      type: "review_request_player",
      recipient_user_id: playerProfile.id ?? undefined,
      recipient_email: playerProfile.email,
      booking_id: info.bookingId,
      coach_id: coachProfile?.id ?? undefined,
      scheduled_for: reviewAt,
      template: reviewRequestEmail(info),
    });
  }

  if (canEmail(coachProfile) && coachProfile.email) {
    jobs.push({
      type: "booking_24h_reminder_coach",
      recipient_user_id: coachProfile.id ?? undefined,
      recipient_email: coachProfile.email,
      booking_id: info.bookingId,
      coach_id: coachProfile?.id ?? undefined,
      scheduled_for: reminderAt,
      template: bookingReminderEmail(info, "coach"),
    });
  }

  if (jobs.length === 0) return;

  await admin.from("email_jobs").upsert(
    jobs.map((job) => ({
      type: job.type,
      recipient_user_id: job.recipient_user_id,
      recipient_email: job.recipient_email,
      subject: job.template.subject,
      preview: job.template.preview,
      html: job.template.html,
      text: job.template.text,
      booking_id: job.booking_id,
      coach_id: job.coach_id,
      scheduled_for: job.scheduled_for,
    })),
    { onConflict: "booking_id,type", ignoreDuplicates: true }
  );
}

export async function sendBookingCancelledEmails(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null,
  cancelledBy: "player" | "coach" | "admin",
  refundSummary: string
) {
  const sends: Promise<unknown>[] = [];

  if (canEmail(playerProfile) && playerProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "booking_cancelled_player",
        recipient_user_id: playerProfile.id ?? undefined,
        recipient_email: playerProfile.email,
        booking_id: info.bookingId,
        coach_id: coachProfile?.id ?? undefined,
        template: bookingCancelledEmail(info, "player", cancelledBy, refundSummary),
      })
    );
  }

  if (canEmail(coachProfile) && coachProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "booking_cancelled_coach",
        recipient_user_id: coachProfile.id ?? undefined,
        recipient_email: coachProfile.email,
        booking_id: info.bookingId,
        coach_id: coachProfile.id ?? undefined,
        template: bookingCancelledEmail(info, "coach", cancelledBy, refundSummary),
      })
    );
  }

  await Promise.allSettled(sends);
}

export async function sendRefundIssuedEmail(
  admin: SupabaseClient,
  info: EmailBookingInfo,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null,
  refundAmountNgn: number,
  refundSummary: string
) {
  if (!canEmail(playerProfile) || !playerProfile.email || refundAmountNgn <= 0) return;

  await sendAndRecord(admin, {
    type: "refund_issued_player",
    recipient_user_id: playerProfile.id ?? undefined,
    recipient_email: playerProfile.email,
    booking_id: info.bookingId,
    coach_id: coachProfile?.id ?? undefined,
    template: refundIssuedEmail(info, refundAmountNgn, refundSummary),
  });
}

export async function sendCoachDecisionEmail(
  admin: SupabaseClient,
  coachId: string,
  email: string | null | undefined,
  action: "approve" | "reject",
  reason: string | null,
  needsDirectContact: boolean
) {
  if (!email) return;
  await sendAndRecord(admin, {
    type: action === "approve" ? "coach_approved" : "coach_rejected",
    recipient_user_id: coachId,
    recipient_email: email,
    coach_id: coachId,
    template: coachDecisionEmail(action, reason, needsDirectContact),
  });
}

export async function sendPayoutProcessedEmail(
  admin: SupabaseClient,
  coachId: string,
  email: string | null | undefined,
  amount: number,
  sessionCount: number
) {
  if (!email) return;
  await sendAndRecord(admin, {
    type: "payout_processed_coach",
    recipient_user_id: coachId,
    recipient_email: email,
    coach_id: coachId,
    template: payoutProcessedEmail(amount, sessionCount),
  });
}

export async function sendAdminDigestEmail(
  admin: SupabaseClient,
  adminId: string,
  email: string | null | undefined,
  pendingCount: number
) {
  if (!email) return;
  await sendAndRecord(admin, {
    type: "admin_digest",
    recipient_user_id: adminId,
    recipient_email: email,
    template: adminPendingDigestEmail(pendingCount),
  });
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

export async function sendDisputeOpenedEmails(
  admin: SupabaseClient,
  info: DisputeEmailInfo,
  description: string,
  reporterRole: "player" | "coach",
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null
) {
  const sends: Promise<unknown>[] = [];
  const reporterProfile = reporterRole === "player" ? playerProfile : coachProfile;
  const otherProfile = reporterRole === "player" ? coachProfile : playerProfile;
  const otherRole = reporterRole === "player" ? "coach" : "player";

  if (canEmail(reporterProfile) && reporterProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: `dispute_opened_${reporterRole}`,
        recipient_user_id: reporterProfile.id ?? undefined,
        recipient_email: reporterProfile.email,
        booking_id: info.bookingId,
        template: disputeOpenedReporterEmail(info),
      })
    );
  }

  if (canEmail(otherProfile) && otherProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: `dispute_opened_${otherRole}`,
        recipient_user_id: otherProfile.id ?? undefined,
        recipient_email: otherProfile.email,
        booking_id: info.bookingId,
        template: disputeOpenedOtherPartyEmail(info, otherRole),
      })
    );
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const adminEmail of adminEmails) {
    sends.push(
      sendAndRecord(admin, {
        type: "dispute_opened_admin",
        recipient_email: adminEmail,
        booking_id: info.bookingId,
        template: disputeOpenedAdminEmail(info, description),
      })
    );
  }

  await Promise.allSettled(sends);
}

export async function sendDisputeResolvedEmails(
  admin: SupabaseClient,
  info: DisputeEmailInfo,
  resolution: "refund_player" | "release_to_coach" | "split",
  playerRefundPercent: number,
  playerProfile: EmailProfileWithId | null,
  coachProfile: EmailProfileWithId | null
) {
  const playerOutcome =
    resolution === "refund_player"
      ? "Resolved in your favour — your full refund is on its way to your payment method (2–5 business days)."
      : resolution === "split"
      ? `Resolved with a ${playerRefundPercent}% refund to you, on its way to your payment method (2–5 business days).`
      : "After review, the session was confirmed as delivered and the coach will be paid. If you disagree, reply to this email.";
  const coachOutcome =
    resolution === "release_to_coach"
      ? "Resolved in your favour — your payout for this session will be included in the next payout run."
      : resolution === "split"
      ? `Resolved with a partial payout: you'll receive ${100 - playerRefundPercent}% of the session payout in the next payout run.`
      : "After review, the session was refunded to the player and no payout will be made for it. If you disagree, reply to this email.";

  const sends: Promise<unknown>[] = [];
  if (canEmail(playerProfile) && playerProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "dispute_resolved_player",
        recipient_user_id: playerProfile.id ?? undefined,
        recipient_email: playerProfile.email,
        booking_id: info.bookingId,
        template: disputeResolvedEmail(info, "player", playerOutcome),
      })
    );
  }
  if (canEmail(coachProfile) && coachProfile.email) {
    sends.push(
      sendAndRecord(admin, {
        type: "dispute_resolved_coach",
        recipient_user_id: coachProfile.id ?? undefined,
        recipient_email: coachProfile.email,
        booking_id: info.bookingId,
        template: disputeResolvedEmail(info, "coach", coachOutcome),
      })
    );
  }
  await Promise.allSettled(sends);
}
