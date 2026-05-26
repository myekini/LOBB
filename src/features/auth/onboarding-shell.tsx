"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { courtImage } from "@/lib/demo-content";

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
        "relative min-h-screen bg-[#050505] text-white font-sans overflow-hidden",
        className
      )}
    >
      {/* Background Canvas: Premium Glowing Spotlight & Grid Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[120%] aspect-square rounded-full bg-[radial-gradient(circle_at_center,rgba(217,107,39,0.14)_0%,rgba(217,107,39,0.02)_60%,transparent_100%)] filter blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div 
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none filter blur-[1px]" 
          style={{ backgroundImage: `url(${courtImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/20 via-transparent to-[#050505]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 sm:px-8">
        <header className="flex h-[88px] items-center justify-between">
          {showBack ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="-ml-3 flex size-11 items-center justify-center rounded-full border border-transparent text-white/70 transition hover:border-white/[0.08] hover:bg-white/[0.04]"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.04] border border-white/[0.08]">
                <svg width="14" height="14" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M 8 56 C 8 4 56 4 56 56" stroke="#C4622D" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="32" cy="17" r="5.5" fill="#C4622D" />
                </svg>
              </span>
              <p className="text-[12px] font-black tracking-[0.16em] uppercase text-white/90">LOBB</p>
            </div>
          )}
          {step && (
            <p className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50 backdrop-blur-sm">
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
      className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-[16px] bg-gradient-to-r from-[#D96B27] to-[#C4622D] text-[13px] font-black uppercase tracking-widest text-white shadow-[0_8px_32px_rgba(217,107,39,0.25)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(217,107,39,0.4)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:from-white/[0.04] disabled:to-white/[0.04] disabled:text-white/20 disabled:shadow-none disabled:transform-none"
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
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 backdrop-blur-sm self-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D96B27] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D96B27]"></span>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
        {children}
      </span>
    </div>
  );
}

export function OnboardingTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[36px] sm:text-[42px] font-black leading-[1.06] tracking-[-0.03em] text-white animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-75">
      {children}
    </h1>
  );
}

export function OnboardingCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-[400px] text-[15px] leading-[1.7] text-white/45 animate-in fade-in-0 duration-700 delay-150">{children}</p>;
}
