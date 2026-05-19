import { Circle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const color = status.includes("cancel") ? "text-red-700" : status === "confirmed" ? "text-[var(--lobb-success)]" : "text-[var(--lobb-muted)]";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-[var(--lobb-surface-2)] px-3 py-1.5 text-xs font-black capitalize ${color}`}>
      <Circle className="size-2 fill-current" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
