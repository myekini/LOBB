export type AppErrorSeverity = "info" | "warning" | "error";

export type AppErrorCode =
  | "UNKNOWN_ERROR"
  | "NETWORK_ERROR"
  | "AUTH_EXPIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "BOOKING_SLOT_TAKEN"
  | "BOOKING_SLOT_TOO_SOON"
  | "BOOKING_SLOT_TOO_FAR"
  | "BOOKING_LOCK_EXPIRED"
  | "BOOKING_LOCK_INVALID"
  | "BOOKING_COURT_TAKEN"
  | "BOOKING_COACH_UNAVAILABLE"
  | "BOOKING_PROFILE_REQUIRED"
  | "BOOKING_PAYMENT_ACCOUNT_MISSING"
  | "PAYMENT_INIT_FAILED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "PAYMENT_VERIFY_FAILED"
  | "RECEIPT_NOT_READY"
  | "AVAILABILITY_LOAD_FAILED"
  | "AVAILABILITY_SAVE_FAILED"
  | "AVAILABILITY_INVALID_HOURS"
  | "AVAILABILITY_OVERLAP"
  | "PROFILE_SAVE_FAILED"
  | "RATE_LIMITED";

export type AppErrorPayload = {
  ok: false;
  code: AppErrorCode;
  message: string;
  field?: string;
  details?: unknown;
};

type ErrorCopy = {
  title: string;
  message: string;
  severity: AppErrorSeverity;
};

export const ERROR_COPY: Record<AppErrorCode, ErrorCopy> = {
  UNKNOWN_ERROR: {
    title: "Something went wrong",
    message: "Something went wrong. Please try again.",
    severity: "error",
  },
  NETWORK_ERROR: {
    title: "Connection issue",
    message: "We could not reach LOBB. Check your connection and try again.",
    severity: "error",
  },
  AUTH_EXPIRED: {
    title: "Log in again",
    message: "Your session expired. Please log in again.",
    severity: "warning",
  },
  FORBIDDEN: {
    title: "Not allowed",
    message: "You do not have permission to do that.",
    severity: "error",
  },
  VALIDATION_ERROR: {
    title: "Check the details",
    message: "Some details need attention before we can continue.",
    severity: "warning",
  },
  NOT_FOUND: {
    title: "Not found",
    message: "We could not find what you were looking for.",
    severity: "error",
  },
  BOOKING_SLOT_TAKEN: {
    title: "Slot unavailable",
    message: "That slot was just taken. Please choose another time.",
    severity: "warning",
  },
  BOOKING_SLOT_TOO_SOON: {
    title: "Too close",
    message: "Sessions must be booked at least 24 hours ahead.",
    severity: "warning",
  },
  BOOKING_SLOT_TOO_FAR: {
    title: "Too far ahead",
    message: "You can only book sessions up to 14 days ahead.",
    severity: "warning",
  },
  BOOKING_LOCK_EXPIRED: {
    title: "Hold expired",
    message: "Your 10-minute hold expired. Please choose the slot again.",
    severity: "warning",
  },
  BOOKING_LOCK_INVALID: {
    title: "Start over",
    message: "That booking hold is no longer valid. Please choose the slot again.",
    severity: "warning",
  },
  BOOKING_COURT_TAKEN: {
    title: "Court unavailable",
    message: "That court is already booked for this time. Please choose another court.",
    severity: "warning",
  },
  BOOKING_COACH_UNAVAILABLE: {
    title: "Coach unavailable",
    message: "This coach is not accepting bookings for that time.",
    severity: "warning",
  },
  BOOKING_PROFILE_REQUIRED: {
    title: "Finish setup",
    message: "Complete your player profile before booking.",
    severity: "warning",
  },
  BOOKING_PAYMENT_ACCOUNT_MISSING: {
    title: "Booking unavailable",
    message: "This coach needs to finish payout setup before accepting bookings.",
    severity: "warning",
  },
  PAYMENT_INIT_FAILED: {
    title: "Payment could not start",
    message: "We could not open Paystack. Please try again.",
    severity: "error",
  },
  PAYMENT_NOT_FOUND: {
    title: "Payment not found",
    message: "We could not find that payment reference.",
    severity: "error",
  },
  PAYMENT_PENDING: {
    title: "Still confirming",
    message: "Payment is still being confirmed. This can take a minute.",
    severity: "info",
  },
  PAYMENT_FAILED: {
    title: "Payment not completed",
    message: "Your payment did not go through. No confirmed booking was created.",
    severity: "error",
  },
  PAYMENT_VERIFY_FAILED: {
    title: "Could not confirm payment",
    message: "We could not confirm this payment yet. Please try again or check your bookings.",
    severity: "error",
  },
  RECEIPT_NOT_READY: {
    title: "Receipt not ready",
    message: "The receipt is still being prepared. Try again in a moment.",
    severity: "info",
  },
  AVAILABILITY_LOAD_FAILED: {
    title: "Could not load availability",
    message: "We could not load your availability. Refresh and try again.",
    severity: "error",
  },
  AVAILABILITY_SAVE_FAILED: {
    title: "Could not save availability",
    message: "Your availability was not saved. Please try again.",
    severity: "error",
  },
  AVAILABILITY_INVALID_HOURS: {
    title: "Check your hours",
    message: "End time must be after start time.",
    severity: "warning",
  },
  AVAILABILITY_OVERLAP: {
    title: "Overlapping hours",
    message: "Availability windows cannot overlap.",
    severity: "warning",
  },
  PROFILE_SAVE_FAILED: {
    title: "Could not save profile",
    message: "Your profile changes were not saved. Please try again.",
    severity: "error",
  },
  RATE_LIMITED: {
    title: "Too many requests",
    message: "You've made too many requests. Please wait a moment and try again.",
    severity: "warning",
  },
};

export function appError(code: AppErrorCode, overrides: Partial<Omit<AppErrorPayload, "ok" | "code">> = {}): AppErrorPayload {
  return {
    ok: false,
    code,
    message: overrides.message ?? ERROR_COPY[code].message,
    field: overrides.field,
    details: overrides.details,
  };
}

export function isAppErrorPayload(value: unknown): value is AppErrorPayload {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<AppErrorPayload>;
  return maybe.ok === false && typeof maybe.code === "string" && typeof maybe.message === "string";
}

export function appErrorFromUnknown(error: unknown, fallbackCode: AppErrorCode = "UNKNOWN_ERROR"): AppErrorPayload {
  if (isAppErrorPayload(error)) return error;
  if (error instanceof Error && error.message) {
    return appError(fallbackCode, { message: error.message });
  }
  return appError(fallbackCode);
}
