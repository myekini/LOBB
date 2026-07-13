"use client";

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Shared consent/agreement checkbox used across signup, booking checkout,
 * coach onboarding, and KYC. One look everywhere: a card that highlights when
 * accepted, the LOBB checkbox, and consistent 12px legal copy.
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
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        className="mt-0.5"
      />
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
