"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
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

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 pt-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:pt-7">
        <aside className="lobb-surface-outlined hidden self-start border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 lg:sticky lg:top-24 lg:block">
          <div className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] p-4 text-[var(--lobb-text-inverse)]">
            <div className="flex size-11 items-center justify-center rounded-[var(--lobb-radius-md)] bg-white/10 text-[var(--lobb-clay)]">
              <ShieldCheck className="size-5" />
            </div>
            <p className="mt-4 text-xs font-medium text-white/75">Secure booking</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight">Review before you pay.</h2>
          </div>
          <div className="mt-4 space-y-2">
            {([1, 2, 3] as const).map((s) => {
              const active = s === step;
              const complete = s < step;
              return (
                <div
                  key={s}
                    className={`grid grid-cols-[34px_1fr] items-center gap-3 rounded-[var(--lobb-radius-md)] border p-3 transition ${
                    active
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)]"
                      : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]"
                  }`}
                >
                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${complete ? "bg-[var(--lobb-success)] text-white" : active ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"}`}>
                    {complete ? <CheckCircle2 className="size-4" /> : s}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{STEP_LABELS[s - 1]}</span>
                    <span className="block text-xs text-[var(--lobb-text-secondary)]">{complete ? "Done" : active ? "Current step" : "Up next"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="lg:hidden">
          <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2">
            <div className="grid grid-cols-3 gap-1">
              {([1, 2, 3] as const).map((s) => (
                <div
                  key={s}
                  className={`flex min-h-11 min-w-0 items-center justify-center rounded-[var(--lobb-radius-md)] px-1 text-center text-xs font-medium leading-tight transition-colors duration-300 ${
                    s === step
                      ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                      : s < step
                      ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
                      : "text-[var(--lobb-text-tertiary)]"
                  }`}
                >
                  <span>{STEP_LABELS[s - 1]}</span>
                </div>
              ))}
            </div>
          </div>
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
      className="sticky bottom-4 z-30 mt-6 flex h-14 w-full items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-medium text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.98] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:shadow-none"
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
