export function Calendar({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">{children}</div>;
}
