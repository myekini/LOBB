"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const STEP_LABELS = ["Choose slot", "Location", "Review & pay"] as const;

export function BookingShell({
  children,
  step,
  backHref = "/coaches",
}: {
  children: React.ReactNode;
  step: 1 | 2 | 3;
  backHref?: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] pb-28 text-[var(--lobb-text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/92 px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto grid h-[68px] max-w-5xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link
            href={backHref}
            className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] transition hover:border-[var(--lobb-clay)]/40 active:scale-[0.97]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Step {step} of 3</p>
            <h1 className="truncate text-[15px] font-black">Book Session</h1>
          </div>
          <div aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 lg:pt-6">
        {/* Step progress */}
        <div className="mb-5 rounded-[22px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2 shadow-[var(--lobb-shadow-card)]">
          <div className="grid grid-cols-3 gap-1">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={`flex h-10 items-center justify-center rounded-[16px] text-[10px] font-black uppercase tracking-[0.08em] transition-colors duration-300 ${
                  s === step
                    ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                    : s < step
                    ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
                    : "text-[var(--lobb-text-tertiary)]"
                }`}
              >
                <span className="hidden sm:inline">{STEP_LABELS[s - 1]}</span>
                <span className="sm:hidden">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}

export function BookingButton({
  children,
  disabled,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className="sticky bottom-4 z-30 mt-6 flex h-14 w-full items-center justify-center rounded-[16px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-modal)] transition active:scale-[0.98] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:shadow-none"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
