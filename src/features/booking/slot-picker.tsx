"use client";

export function SlotPicker({ slots, value, onChange }: { slots: string[]; value?: string; onChange: (slot: string) => void }) {
  return <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <button key={slot} onClick={() => onChange(slot)} className={`h-11 rounded-full border text-sm font-black ${value === slot ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "border-[var(--lobb-border)]"}`}>{slot}</button>)}</div>;
}
