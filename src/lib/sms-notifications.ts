import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bookingConfirmedCoachMessage,
  bookingConfirmedPlayerMessage,
  bookingPaymentInitiatedCoachMessage,
  type NotificationBookingInfo,
} from "@/lib/notification-messages";
import { sendNotificationSms } from "@/lib/sms";

type SmsJobType =
  | "booking_payment_initiated_coach"
  | "booking_confirmed_player"
  | "booking_confirmed_coach";

type SmsProfile = {
  id?: string | null;
  phone_number?: string | null;
};

async function sendAndRecordSms(
  admin: SupabaseClient,
  input: {
    type: SmsJobType;
    phone: string | null | undefined;
    message: string;
    bookingId: string;
    coachId?: string | null;
    recipientUserId?: string | null;
  }
) {
  if (!input.phone) return;

  const { data: job, error: reserveError } = await admin
    .from("sms_jobs")
    .insert({
      type: input.type,
      recipient_user_id: input.recipientUserId,
      recipient_phone: input.phone,
      message: input.message,
      booking_id: input.bookingId,
      coach_id: input.coachId,
      status: "cancelled",
      error_message: "Reserved for immediate send",
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (reserveError) {
    if (reserveError.code === "23505") return;
    throw reserveError;
  }
  if (!job?.id) return;

  try {
    await sendNotificationSms({ phone: input.phone, message: input.message });
    await admin
      .from("sms_jobs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        failed_at: null,
        error_message: null,
      })
      .eq("id", job.id);
  } catch (error) {
    await admin
      .from("sms_jobs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "SMS failed",
      })
      .eq("id", job.id);
  }
}

export async function sendBookingPaymentInitiatedCoachSms(
  admin: SupabaseClient,
  info: NotificationBookingInfo,
  coachProfile: SmsProfile | null | undefined
) {
  await sendAndRecordSms(admin, {
    type: "booking_payment_initiated_coach",
    phone: coachProfile?.phone_number,
    message: bookingPaymentInitiatedCoachMessage(info),
    bookingId: info.bookingId,
    coachId: coachProfile?.id,
    recipientUserId: coachProfile?.id,
  });
}

export async function sendBookingConfirmedSms(
  admin: SupabaseClient,
  info: NotificationBookingInfo,
  playerProfile: SmsProfile | null | undefined,
  coachProfile: SmsProfile | null | undefined
) {
  await Promise.allSettled([
    sendAndRecordSms(admin, {
      type: "booking_confirmed_player",
      phone: playerProfile?.phone_number,
      message: bookingConfirmedPlayerMessage(info),
      bookingId: info.bookingId,
      coachId: coachProfile?.id,
      recipientUserId: playerProfile?.id,
    }),
    sendAndRecordSms(admin, {
      type: "booking_confirmed_coach",
      phone: coachProfile?.phone_number,
      message: bookingConfirmedCoachMessage(info),
      bookingId: info.bookingId,
      coachId: coachProfile?.id,
      recipientUserId: coachProfile?.id,
    }),
  ]);
}
