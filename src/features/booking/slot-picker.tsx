"use client";

export function SlotPicker({ slots, value, onChange }: { slots: string[]; value?: string; onChange: (slot: string) => void }) {
  return <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <button key={slot} onClick={() => onChange(slot)} className={`h-11 rounded-full border text-sm font-black ${value === slot ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white" : "border-[var(--lobb-border)]"}`}>{slot}</button>)}</div>;
}
