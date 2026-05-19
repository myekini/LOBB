"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-8 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-center border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <Link
          href={backHref}
          className="absolute left-3 flex size-10 items-center justify-center rounded-full border border-transparent transition hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface)]"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="text-center">
          <h1 className="font-black">Book a Session</h1>
        </div>
      </header>
      <div className="mx-auto max-w-md px-5 pt-5">
        <div className="mb-6">
          <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Step {step} of 3</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[var(--lobb-clay)]" : "bg-[var(--lobb-surface-2)]"}`} />
            ))}
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function BookingButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
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
