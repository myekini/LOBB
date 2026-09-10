// Canonical player-facing wording for the "issue reported → payout frozen →
// admin resolves" flow. Import these everywhere (booking screens, dialogs,
// toasts, email templates) so the promise reads identically wherever a player
// meets it. Keep it plain, specific, and free of repeated reassurance.

export const SUPPORT_EMAIL = "support@lobb.ng";
export const DISPUTE_SLA_HOURS = 48;

export const trustCopy = {
  /** Toast shown the moment a report is filed. */
  reportAck: `Report received. The coach's payout is on hold while we review — expect an update within ${DISPUTE_SLA_HOURS} hours.`,
  /** One-line prompt above the report form. */
  reportPrompt: `Reporting puts the coach's payout on hold while we review — usually within ${DISPUTE_SLA_HOURS} hours.`,
  /** Status while a dispute is open. */
  reviewInProgress: `The coach's payout stays on hold until this is resolved. We'll be in touch within ${DISPUTE_SLA_HOURS} hours.`,
  /** Small deterrent under the submit button. */
  falseReport: "Only report genuine problems — false reports can lead to account review.",
  /** Resolutions. */
  resolvedRefund: "Resolved in your favour — your refund is on its way to your original payment method.",
  resolvedNoRefund: `Resolved after review. If you disagree, reply to the resolution email or contact ${SUPPORT_EMAIL}.`,
  resolvedPartial: (percent: number) => `Resolved with a ${percent}% refund to you.`,
} as const;
