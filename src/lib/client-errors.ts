"use client";

import { appError, appErrorFromUnknown, ERROR_COPY, isAppErrorPayload, type AppErrorCode, type AppErrorPayload } from "@/lib/app-errors";
import { showLobbToast } from "@/providers/lobb-global-state";

type LegacyErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
};

export async function readApiError(response: Response, fallbackCode: AppErrorCode = "UNKNOWN_ERROR"): Promise<AppErrorPayload> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return appError(fallbackCode);
  }

  if (isAppErrorPayload(payload)) return payload;

  const legacy = payload as LegacyErrorPayload;
  const message = legacy?.error ?? legacy?.message;
  if (typeof message === "string" && message.trim()) {
    return appError(fallbackCode, { message });
  }

  return appError(fallbackCode);
}

export function toastAppError(error: unknown, fallbackCode: AppErrorCode = "UNKNOWN_ERROR") {
  const normalized = appErrorFromUnknown(error, fallbackCode);
  const copy = ERROR_COPY[normalized.code];
  showLobbToast({
    type: copy.severity === "warning" ? "warning" : copy.severity === "info" ? "info" : "error",
    title: copy.title,
    message: normalized.message,
  });
  return normalized;
}

export function toastAppSuccess(message: string, title = "Done") {
  showLobbToast({ type: "success", title, message });
}
