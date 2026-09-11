"use client";

export function Tabs<T extends string>({ value, values, onChange }: { value: T; values: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="grid rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-1" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {values.map((item) => (
        <button key={item.value} type="button" onClick={() => onChange(item.value)} className={`h-[var(--lobb-control-md)] rounded-[var(--lobb-radius-sm)] text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lobb-clay)] ${value === item.value ? "bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] shadow-sm" : "text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)]"}`}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
