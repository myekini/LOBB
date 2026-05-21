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
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-center border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <Link
          href={backHref}
          className="absolute left-3 flex size-10 items-center justify-center rounded-full border border-transparent transition hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface)]"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-black">Book a Session</h1>
      </header>

      <div className="mx-auto max-w-md px-5 pt-5">
        {/* Step progress */}
        <div className="mb-7">
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
          <div className="mt-2 grid grid-cols-3">
            {STEP_LABELS.map((label, i) => (
              <p
                key={label}
                className={`text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
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
