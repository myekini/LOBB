"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const STEP_LABELS = ["Choose slot", "Your details", "Review & pay"] as const;

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
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-10 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto grid h-[72px] max-w-3xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link
            href={backHref}
            className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] shadow-[0_8px_22px_rgba(13,13,13,0.05)] transition hover:border-[var(--lobb-clay)]/40 active:scale-[0.97]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Step {step} of 3</p>
            <h1 className="truncate text-base font-black">Book a Session</h1>
          </div>
          <div aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6 lg:pt-7">
        {/* Step progress */}
        <div className="mb-7 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_12px_30px_rgba(13,13,13,0.04)]">
          <div className="grid grid-cols-3 gap-1.5">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                className={`h-1 rounded-full transition-colors duration-300 ${
                  s <= step ? "bg-[var(--lobb-clay)]" : "bg-[var(--lobb-surface-2)]"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {STEP_LABELS.map((label, i) => (
              <p
                key={label}
                className={`truncate text-center text-[10px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 sm:tracking-wider ${
                  i + 1 === step
                    ? "text-[var(--lobb-clay)]"
                    : i + 1 < step
                    ? "text-[var(--lobb-muted)]"
                    : "text-[var(--lobb-surface-2)]"
                }`}
              >
                {label}
              </p>
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
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-6 h-14 w-full rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)] transition active:scale-[0.98] disabled:bg-[#cfc6b8] disabled:shadow-none"
    >
      {children}
    </button>
  );
}
