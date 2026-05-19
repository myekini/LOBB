"use client";

export function Tabs<T extends string>({ value, values, onChange }: { value: T; values: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((item) => (
        <button key={item.value} onClick={() => onChange(item.value)} className={`h-11 rounded-[14px] text-sm font-black ${value === item.value ? "bg-[var(--lobb-black)] text-white" : "text-[var(--lobb-muted)]"}`}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
