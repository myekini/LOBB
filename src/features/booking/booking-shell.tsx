"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
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
    <main
      className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]"
    >
      <header className="lobb-app-header sticky top-0 z-40 border-b border-[var(--lobb-border-subtle)] px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto grid h-[72px] max-w-6xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link
            href={backHref}
            className="flex size-11 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/40 active:scale-[0.97]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Step {step} of 3</p>
            <h1 className="truncate text-[15px] font-semibold">Book a session</h1>
          </div>
          <div className="size-11" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6 lg:pt-7">
        <ol aria-label="Booking progress" className="mb-5 grid grid-cols-3 border-b border-[var(--lobb-border-subtle)]">
          {([1, 2, 3] as const).map((s) => (
            <li key={s} aria-current={s === step ? "step" : undefined} className={`relative flex min-w-0 items-center justify-center gap-1.5 px-1 pb-3 text-center text-xs font-medium sm:text-sm ${s === step ? "text-[var(--lobb-text-primary)]" : s < step ? "text-[var(--lobb-success)]" : "text-[var(--lobb-text-tertiary)]"}`}>
              {s < step && <Check className="size-3.5 shrink-0" />}
              <span className="truncate">{STEP_LABELS[s - 1]}</span>
              {s === step && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[var(--lobb-bg-inverse)]" />}
            </li>
          ))}
        </ol>
        <section className="min-w-0">{children}</section>
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
    <LobbButton variant="unstyled"
      disabled={disabled || loading}
      onClick={onClick}
      className="sticky bottom-3 z-30 mt-6 flex min-h-12 w-full whitespace-normal rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-4 py-3 text-center text-sm font-semibold leading-5 text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-sheet)] transition active:scale-[0.99] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:shadow-none"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </LobbButton>
  );
}
