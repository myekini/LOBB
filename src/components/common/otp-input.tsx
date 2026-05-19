"use client";

export function OTPInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      className="h-14 w-full rounded-[18px] border border-[var(--lobb-border)] bg-white px-4 text-center font-mono text-xl font-black tracking-[0.45em] outline-none"
      maxLength={6}
    />
  );
}
