"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/theme-toggle";

type OnboardingShellProps = {
  children: React.ReactNode;
  step?: string;
  showBack?: boolean;
  /** When provided the back arrow is a link; otherwise falls back to router.back() */
  backHref?: string;
  className?: string;
};

export function OnboardingShell({
  children,
  step,
  showBack = true,
  backHref,
  className,
}: OnboardingShellProps) {
  const router = useRouter();

  const stepMatch = step?.match(/^(\d+) of (\d+)$/);
  const stepCurrent = stepMatch ? parseInt(stepMatch[1]) : 0;
  const stepTotal = stepMatch ? parseInt(stepMatch[2]) : 0;
  const progressPct = stepTotal > 0 ? Math.round((stepCurrent / stepTotal) * 100) : 0;

  const backButton = backHref ? (
    <Link
      href={backHref}
      aria-label="Go back"
      className="-ml-2.5 flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--lobb-muted)] transition hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface-2)] hover:text-[var(--lobb-black)]"
    >
      <ArrowLeft className="size-5" />
    </Link>
  ) : (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => router.back()}
      className="-ml-2.5 flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--lobb-muted)] transition hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface-2)] hover:text-[var(--lobb-black)]"
    >
      <ArrowLeft className="size-5" />
    </button>
  );

  return (
    <main
      className={cn(
        "lobb-onboarding relative min-h-[100dvh] bg-[var(--lobb-bg)] text-[var(--lobb-black)] font-sans overflow-x-hidden",
        className
      )}
    >
      {/* Desktop background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="lobb-onboarding-wash absolute inset-0" />
        <div className="lobb-onboarding-grid absolute inset-0" />
        <svg
          className="lobb-onboarding-court hidden lg:block absolute bottom-0 left-1/2 -translate-x-1/2 w-[520px]"
          viewBox="0 0 520 380" fill="none" xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="1" y="1" width="518" height="378" rx="2" stroke="currentColor" strokeWidth="2" />
          <line x1="1" y1="189" x2="519" y2="189" stroke="currentColor" strokeWidth="2" />
          <line x1="1" y1="95" x2="519" y2="95" stroke="currentColor" strokeWidth="1.5" />
          <line x1="1" y1="283" x2="519" y2="283" stroke="currentColor" strokeWidth="1.5" />
          <line x1="260" y1="95" x2="260" y2="189" stroke="currentColor" strokeWidth="1.5" />
          <line x1="260" y1="189" x2="260" y2="283" stroke="currentColor" strokeWidth="1.5" />
          <line x1="64" y1="1" x2="64" y2="379" stroke="currentColor" strokeWidth="1.5" />
          <line x1="456" y1="1" x2="456" y2="379" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center lg:justify-center lg:py-10">

        {/* Desktop wordmark — only shown when there is no back arrow to avoid duplication */}
        {!showBack && (
          <div className="hidden lg:flex items-center gap-2.5 mb-6">
            <span className="flex size-8 items-center justify-center rounded-[10px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_8px_24px_rgba(58,43,20,0.04)]">
              <LobbMark size={16} />
            </span>
            <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[var(--lobb-black)]">LOBB</span>
          </div>
        )}

        {/* Card */}
        <div className="lobb-onboarding-panel flex w-full flex-1 flex-col px-5 sm:px-7 lg:max-w-[560px] lg:flex-none lg:border lg:px-8 lg:pb-8 xl:max-w-[620px]">

          <header className="flex h-16 shrink-0 items-center justify-between lg:h-14">
            {showBack ? backButton : (
              <div className="flex items-center gap-2 lg:hidden">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
                  <LobbMark size={13} />
                </span>
                <p className="text-[12px] font-black tracking-[0.16em] uppercase text-[var(--lobb-black)]">LOBB</p>
              </div>
            )}
            <ThemeToggle className="size-10" />
          </header>

          {stepTotal > 0 && (
            <div
              className="lobb-onboarding-progress mb-1 h-[4px] w-full overflow-hidden"
              aria-label={`Step ${stepCurrent} of ${stepTotal}`}
            >
              <div
                className="h-full bg-[var(--lobb-clay)] transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {children}
        </div>

        {!showBack && (
          <p className="hidden lg:block mt-6 text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">
            Book a coach. Not a favor.
          </p>
        )}
      </div>
    </main>
  );
}

function LobbMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M 8 56 C 8 4 56 4 56 56" stroke="var(--lobb-clay)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="17" r="5.5" fill="var(--lobb-clay)" />
    </svg>
  );
}

export function OnboardingButton({
  children,
  disabled,
  loading,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      data-onboarding-primary
      className="group relative flex h-14 w-full items-center justify-center overflow-hidden bg-[var(--lobb-clay)] text-[13px] font-black uppercase tracking-widest text-white shadow-[0_14px_30px_rgba(150,74,35,0.22)] transition-all duration-300 hover:bg-[var(--lobb-clay-dark)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-surface-2)] disabled:text-[var(--lobb-muted)] disabled:shadow-none disabled:transform-none"
    >
      <span className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-white/70" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function OnboardingKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-3.5 py-1.5 self-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lobb-clay)] opacity-50"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--lobb-clay)]"></span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
        {children}
      </span>
    </div>
  );
}

export function OnboardingTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="max-w-[13ch] text-[34px] sm:text-[42px] font-black leading-[1.04] text-[var(--lobb-black)] animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-75">
      {children}
    </h1>
  );
}

export function OnboardingCopy({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.7] text-[var(--lobb-muted)] animate-in fade-in-0 duration-700 delay-150">
      {children}
    </p>
  );
}

export function OnboardingFieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--lobb-text-secondary)]">
        {children}
        {required && <span className="ml-1 text-[var(--lobb-error)] normal-case">*</span>}
      </span>
      {hint && (
        <span className="text-[11px] text-[var(--lobb-text-tertiary)]">{hint}</span>
      )}
    </div>
  );
}
