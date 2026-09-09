"use client";

import { Button as LobbButton } from "@/components/ui/button";
export function SlotPicker({ slots, value, onChange }: { slots: string[]; value?: string; onChange: (slot: string) => void }) {
  return <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <LobbButton variant="unstyled" key={slot} onClick={() => onChange(slot)} className={`h-11 rounded-[var(--lobb-radius-lg)] border text-sm font-semibold ${value === slot ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "border-[var(--lobb-border-subtle)]"}`}>{slot}</LobbButton>)}</div>;
}
