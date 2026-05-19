"use client";

export function PhoneInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-14 items-center gap-2 rounded-[18px] border border-[var(--lobb-border)] bg-white px-4">
      <span className="font-black text-[var(--lobb-muted)]">+234</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} inputMode="tel" className="min-w-0 flex-1 bg-transparent font-black outline-none" placeholder="801 234 5678" />
    </label>
  );
}
