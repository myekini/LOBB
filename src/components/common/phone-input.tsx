"use client";

import { Input as LobbInput } from "@/components/ui/input";
export function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-14 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 transition focus-within:border-[var(--lobb-border-focus)] focus-within:ring-3 focus-within:ring-[var(--lobb-clay)]/15">
      <span className="font-medium text-[var(--lobb-text-secondary)]">+234</span>
      <LobbInput value={value} onChange={(event) => onChange(event.target.value)} inputMode="tel" className="min-w-0 flex-1 bg-transparent font-medium text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)]" placeholder="801 234 5678" />
    </label>
  );
}
