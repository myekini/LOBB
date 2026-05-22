import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import {
  adminPendingDigestEmail,
  bookingCancelledEmail,
  bookingConfirmedCoachEmail,
  bookingConfirmedPlayerEmail,
  bookingReminderEmail,
  coachDecisionEmail,
  payoutProcessedEmail,
  reviewRequestEmail,
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
  status?: "pending" | "sent" | "failed";
  provider_message_id?: string | null;
  error_message?: string | null;
};

function canEmail(profile: EmailProfileWithId | null | undefined): profile is EmailProfileWithId & { email: string } {
  return Boolean(profile?.email && profile.email_notifications_enabled !== false);
}

async function insertEmailJob(admin: SupabaseClient, input: EmailJobInput) {
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
  try {
    const result = await sendEmail({
      to: input.recipient_email,
      subject: input.template.subject,
      preview: input.template.preview,
      html: input.template.html,
      text: input.template.text,
    });
    await insertEmailJob(admin, {
      ...input,
      status: "sent",
      provider_message_id: result?.id ?? null,
    });
  } catch (error) {
    await insertEmailJob(admin, {
      ...input,
      status: "failed",
      error_message: error instanceof Error ? error.message : "Email failed",
    });
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
