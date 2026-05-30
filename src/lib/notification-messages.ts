import { appUrl } from "@/lib/api-auth";

export type NotificationBookingInfo = {
  bookingId: string;
  coachName: string;
  playerName: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  playerNotes: string | null;
  reference?: string;
  coachPhone: string | null;
  playerPhone: string | null;
};

export function formatSmsDate(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

export function bookingConfirmedPlayerMessage(info: NotificationBookingInfo) {
  return `LOBB: Your session with ${info.coachName} is confirmed for ${formatSmsDate(info.startsAt)}. Their number: ${info.coachPhone ?? "available after payment"}. Details: ${appUrl(`/dashboard/bookings/${info.bookingId}`)}`;
}

export function bookingConfirmedCoachMessage(info: NotificationBookingInfo) {
  const note = info.playerNotes ? info.playerNotes : "No note";
  return `LOBB: New booking from ${info.playerName} on ${formatSmsDate(info.startsAt)}. Note: ${note}. View: ${appUrl(`/coach/bookings/${info.bookingId}`)}`;
}

export function bookingPaymentInitiatedCoachMessage(info: NotificationBookingInfo) {
  const note = info.playerNotes ? ` Note: ${info.playerNotes}.` : "";
  return `LOBB: ${info.playerName} started payment for ${formatSmsDate(info.startsAt)} at ${info.location}.${note} We will confirm once payment clears.`;
}

export function reminderPlayerMessage(info: NotificationBookingInfo) {
  return `LOBB: Tennis session with ${info.coachName} tomorrow at ${formatSmsDate(info.startsAt)}. ${info.location}`;
}

export function reminderCoachMessage(info: NotificationBookingInfo) {
  return `LOBB: Session with ${info.playerName} tomorrow at ${formatSmsDate(info.startsAt)}. Be ready.`;
}

export function cancelledMessage(startsAt: string, refundNote: string) {
  return `LOBB: Your booking on ${formatSmsDate(startsAt)} has been cancelled. ${refundNote}`;
}

export function reviewRequestMessage(info: NotificationBookingInfo) {
  return `LOBB: How was your session with ${info.coachName}? Rate them here: ${appUrl(`/dashboard/review/${info.bookingId}`)}`;
}

export function payoutProcessedMessage(amount: number, sessionCount: number) {
  return `LOBB: ₦${amount.toLocaleString("en-NG")} sent to your bank for ${sessionCount} completed sessions. Check: ${appUrl("/coach/earnings")}`;
}

export function coachApprovedMessage() {
  return `LOBB: You're live. Players can now find and book you. Set up your availability: ${appUrl("/coach/availability")}`;
}

export function coachRejectedMessage(reason: string, isThirdRejection: boolean) {
  const base = `LOBB: Your profile needs updates before it can go live. Reason: ${reason}. Edit and resubmit: ${appUrl("/coach/profile/edit")}`;
  if (isThirdRejection) {
    return `${base} — This is your 3rd rejection. Please contact us directly to resolve this.`;
  }
  return base;
}

export function adminPendingDigestMessage(pendingCount: number) {
  return `LOBB Admin: ${pendingCount} coach profile${pendingCount === 1 ? "" : "s"} pending your approval. Review: ${appUrl("/admin/coaches")}`;
}
