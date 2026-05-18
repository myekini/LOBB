"use client";

import { ArrowLeft } from "lucide-react";
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
        "min-h-screen bg-[var(--lobb-bg)] text-[var(--lobb-ink)]",
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
              className="-ml-2 flex size-10 items-center justify-center rounded-full border border-transparent text-[var(--lobb-black)] transition hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface)]"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <p className="text-[13px] font-black tracking-[0.18em] text-[var(--lobb-black)]">LOBB</p>
          )}
          {step && (
            <p className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1 text-xs font-bold text-[var(--lobb-muted)]">
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
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-black)] text-sm font-black text-white shadow-[0_14px_30px_rgba(11,11,10,0.16)] transition hover:bg-black active:scale-[0.98] disabled:pointer-events-none disabled:bg-[#cfc6b8] disabled:text-white disabled:shadow-none"
    >
      {children}
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
    <h1 className="text-[34px] font-black leading-[36px] tracking-normal text-[var(--lobb-black)]">
      {children}
    </h1>
  );
}

export function OnboardingCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-sm text-[15px] leading-6 text-[var(--lobb-muted)]">{children}</p>;
}
