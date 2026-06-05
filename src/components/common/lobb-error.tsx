"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ERROR_COPY, appErrorFromUnknown, type AppErrorCode, type AppErrorPayload } from "@/lib/app-errors";
import { cn } from "@/lib/utils";

type ErrorLike = AppErrorPayload | Error | string | null | undefined;

function normalize(error: ErrorLike, fallbackCode: AppErrorCode): AppErrorPayload {
  if (typeof error === "string") return appErrorFromUnknown(new Error(error), fallbackCode);
  return appErrorFromUnknown(error, fallbackCode);
}

export function LobbErrorBanner({
  error,
  fallbackCode = "UNKNOWN_ERROR",
  actionLabel,
  onAction,
  className,
}: {
  error: ErrorLike;
  fallbackCode?: AppErrorCode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  if (!error) return null;
  const normalized = normalize(error, fallbackCode);
  const copy = ERROR_COPY[normalized.code];

  return (
    <div
      role="alert"
      className={cn(
        "rounded-[14px] border border-[var(--lobb-error)]/20 bg-[var(--lobb-error)]/10 px-4 py-3 text-[var(--lobb-text-primary)]",
        copy.severity === "warning" && "border-[var(--lobb-warning)]/25 bg-[var(--lobb-warning)]/10",
        copy.severity === "info" && "border-[var(--lobb-clay)]/20 bg-[var(--lobb-clay-light)]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-clay)]">
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{copy.title}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">{normalized.message}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-[10px] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-black text-[var(--lobb-text-inverse)]"
            >
              <RefreshCw className="size-3.5" />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LobbFieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-bold leading-relaxed text-[var(--lobb-error)]">{message}</p>;
}

export function LobbEmptyErrorState({
  title,
  message,
  icon: Icon = AlertTriangle,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="rounded-[14px] border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-black text-[var(--lobb-text-primary)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-6 text-sm font-black text-[var(--lobb-text-inverse)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
