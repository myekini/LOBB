"use client";

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
      className={`flex cursor-pointer items-start gap-3.5 rounded-[var(--lobb-radius-lg)] border p-4 text-left transition-all duration-200 ${
        checked
          ? "border-[var(--lobb-clay)]/45 bg-[var(--lobb-clay)]/5"
          : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] hover:border-[var(--lobb-clay)]/35"
      } ${className}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-relaxed text-[var(--lobb-text-secondary)]">
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

/**
 * Container for two or more related consent checkboxes. Renders them as
 * rows inside one card with hairline dividers, instead of each checkbox
 * being its own bordered box — stacking several `ConsentCheckbox`es reads
 * as a wall of near-identical cards; this reads as one decision with a
 * couple of parts. Use `ConsentRow` (not `ConsentCheckbox`) for children.
 */
export function ConsentGroup({
  label,
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]",
        className,
      )}
    >
      {label && (
        <p className="border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
          {label}
        </p>
      )}
      <div className="divide-y divide-[var(--lobb-border-subtle)]">{children}</div>
    </div>
  );
}

/** One row inside a `ConsentGroup` — same shape as `ConsentCheckbox`, no border of its own. */
export function ConsentRow({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3.5 p-4 text-left transition-colors duration-150 ${
        checked ? "bg-[var(--lobb-clay)]/5" : "hover:bg-[var(--lobb-bg-secondary)]/60"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-relaxed text-[var(--lobb-text-secondary)]">
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
      className="font-medium text-[var(--lobb-clay)] underline-offset-2 hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}
