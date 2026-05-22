import { sendOtpSms } from "@/lib/sms";

type BookingInfo = {
  coachName: string;
  playerName: string;
  startsAt: string;     // ISO timestamp
  location: string;
  playerNotes: string | null;
  reference: string;
  coachPhone: string | null;
  playerPhone: string | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    hour:    "numeric",
    minute:  "2-digit",
    hour12:  true,
    timeZone: "Africa/Lagos",
  });
}

export async function sendPlayerBookingConfirmedSms(info: BookingInfo): Promise<void> {
  if (!info.playerPhone) return;

  const msg = [
    `LOBB: Booking confirmed!`,
    `Coach: ${info.coachName}`,
    `Date: ${formatDate(info.startsAt)}`,
    info.location ? `Where: ${info.location}` : null,
    `Duration: 60 mins`,
    `Ref: ${info.reference}`,
    info.coachPhone ? `Coach phone: ${info.coachPhone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendOtpSms({ phone: info.playerPhone, message: msg });
}

export async function sendCoachBookingNotificationSms(info: BookingInfo): Promise<void> {
  if (!info.coachPhone) return;

  const msg = [
    `LOBB: New booking!`,
    `Player: ${info.playerName}`,
    `Date: ${formatDate(info.startsAt)}`,
    info.location ? `Where: ${info.location}` : null,
    `Duration: 60 mins`,
    info.playerNotes ? `Note: "${info.playerNotes}"` : null,
    info.playerPhone ? `Player phone: ${info.playerPhone}` : null,
    `Ref: ${info.reference}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendOtpSms({ phone: info.coachPhone, message: msg });
}

export async function sendCancellationSmsBoth(
  info: BookingInfo,
  cancelledBy: "player" | "coach",
  refundSummary: string
): Promise<void> {
  const dateLabel = formatDate(info.startsAt);

  if (info.playerPhone) {
    const msg = [
      `LOBB: Session cancelled.`,
      `Coach: ${info.coachName}`,
      `Date: ${dateLabel}`,
      refundSummary,
      `Ref: ${info.reference}`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendOtpSms({ phone: info.playerPhone, message: msg }).catch(() => null);
  }

  if (info.coachPhone) {
    const who = cancelledBy === "player" ? `${info.playerName} (player)` : "you";
    const msg = [
      `LOBB: Session on ${dateLabel} was cancelled by ${who}.`,
      cancelledBy === "player"
        ? `The player's refund has been processed.`
        : `A full refund was issued to the player.`,
      `Ref: ${info.reference}`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendOtpSms({ phone: info.coachPhone, message: msg }).catch(() => null);
  }
}
