"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  children: React.ReactNode;
  step?: string;
  showBack?: boolean;
  className?: string;
};

export function OnboardingShell({
  children,
  step,
  showBack = true,
  className,
}: OnboardingShellProps) {
  const router = useRouter();

  return (
    <main
      className={cn(
        "min-h-screen bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-primary)]",
        className
      )}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5">
        <header className="flex h-[72px] items-center justify-between">
          {showBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="-ml-2 flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-border-subtle)] hover:bg-[var(--lobb-bg-secondary)]"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <p className="text-[13px] font-black tracking-[0.18em] text-[var(--lobb-text-primary)]">LOBB</p>
          )}
          {step && (
            <p className="rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-3 py-1 text-xs font-bold text-[var(--lobb-text-secondary)]">
              {step}
            </p>
          )}
        </header>

        {children}
      </div>
    </main>
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
      className="flex h-14 w-full items-center justify-center rounded-[14px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition hover:bg-[#2A2520] active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:shadow-none"
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

export function OnboardingKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
      {children}
    </p>
  );
}

export function OnboardingTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[34px] font-black leading-[36px] tracking-normal text-[var(--lobb-text-primary)]">
      {children}
    </h1>
  );
}

export function OnboardingCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-sm text-[15px] leading-6 text-[var(--lobb-text-secondary)]">{children}</p>;
}
