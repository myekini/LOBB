import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function TennisLineIllustration({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 96" fill="none" aria-hidden="true">
      <path
        d="M19 66c19-12 39-16 61-11 13 3 24 9 33 18"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M36 35c-11 11-12 26-3 35 9 8 24 7 35-4 11-11 12-26 3-35-9-8-24-7-35 4Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path d="m64 64 27 24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M36 48h35M39 37l25 25M50 30l25 25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".42" />
      <circle cx="101" cy="30" r="9" stroke="currentColor" strokeWidth="3" />
      <path d="M94 30h14M101 23v14" stroke="currentColor" strokeWidth="1.8" opacity=".4" />
    </svg>
  );
}

export function LobbEmptyState({ title, body, action, className = "" }: EmptyStateProps) {
  return (
    <section
      className={`rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-6 py-10 text-center shadow-[0_12px_28px_rgba(13,13,13,0.05)] ${className}`}
    >
      <TennisLineIllustration className="mx-auto h-24 w-32 text-[var(--lobb-clay)]" />
      <h2 className="mt-5 text-[16px] font-black text-[var(--lobb-black)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-[260px] text-[13px] font-medium leading-5 text-[var(--lobb-muted)]">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

