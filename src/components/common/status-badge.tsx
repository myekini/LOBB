import { Circle } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const color = status.includes("cancel")
    ? "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"
    : status === "confirmed" || status === "paid" || status === "approved"
      ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
      : status.includes("pending") || status.includes("review")
        ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
        : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black capitalize ${color}`}>
      <Circle className="size-2 fill-current" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
