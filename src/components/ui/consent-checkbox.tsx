"use client";

import type { ReactNode } from "react";

/**
 * Shared consent/agreement checkbox used across signup, booking checkout,
 * coach onboarding, and KYC. One look everywhere: a card that highlights when
 * accepted, a custom clay checkbox, and consistent 12px legal copy.
 *
 * `children` is the statement itself (links included); `hint` renders as a
 * muted secondary line for supporting detail (fees, timing, retention rules).
 */
export function ConsentCheckbox({
  checked,
  onChange,
  children,
  hint,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3.5 rounded-[14px] border p-4 text-left transition-all duration-200 ${
        checked
          ? "border-[var(--lobb-clay)]/45 bg-[var(--lobb-clay)]/5"
          : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] hover:border-[var(--lobb-clay)]/35"
      } ${className}`}
    >
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-5 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-[var(--lobb-text-tertiary)]/45 bg-[var(--lobb-surface)] transition-all checked:border-[var(--lobb-clay)] checked:bg-[var(--lobb-clay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]/40 focus-visible:ring-offset-1"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 transition-opacity peer-checked:opacity-100"
          width="11"
          height="9"
          viewBox="0 0 10 8"
          fill="none"
        >
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
          {children}
        </span>
        {hint && (
          <span className="mt-1 block text-[11px] font-medium leading-relaxed text-[var(--lobb-text-tertiary)]">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/** Inline policy link with the shared consent-text styling. */
export function ConsentLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-black text-[var(--lobb-clay)] underline-offset-2 hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
