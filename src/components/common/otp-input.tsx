"use client";

export function OTPInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      className="h-14 w-full rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-center font-mono text-xl font-black tracking-[0.45em] text-[var(--lobb-text-primary)] outline-none transition placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)] focus:ring-3 focus:ring-[var(--lobb-clay)]/15"
      maxLength={6}
    />
  );
}
