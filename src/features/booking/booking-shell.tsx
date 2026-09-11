"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/theme-toggle";

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
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Book a session</p>
            <h1 className="truncate text-[15px] font-semibold">{STEP_LABELS[step - 1]}</h1>
          </div>
          <ThemeToggle className="size-11 rounded-[var(--lobb-radius-md)]" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6 lg:pt-7">
        <div className="mb-4 flex items-center gap-3" aria-label={`Step ${step} of 3: ${STEP_LABELS[step - 1]}`}>
          <span className="shrink-0 text-xs font-medium text-[var(--lobb-text-secondary)]">Step {step} of 3</span>
          <span className="grid flex-1 grid-cols-3 gap-1.5" aria-hidden="true">{([1, 2, 3] as const).map((item) => <span key={item} className={`h-1 rounded-full ${item <= step ? "bg-[var(--lobb-clay)]" : "bg-[var(--lobb-border-subtle)]"}`} />)}</span>
        </div>
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
