import { Circle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBadgeProps = { status: string; className?: string };

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes("cancel") || normalized.includes("reject") || normalized.includes("fail")
    ? "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"
    : ["confirmed", "paid", "approved", "completed"].includes(normalized)
      ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
      : normalized.includes("pending") || normalized.includes("review")
        ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
        : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]";

  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-semibold capitalize", tone, className)}>
      {normalized === "completed" ? <Check className="size-3" strokeWidth={3} /> : <Circle className="size-2 fill-current" />}
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-[8px] border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay-light)] px-2 py-1 text-[11px] font-semibold text-[var(--lobb-clay)]", className)}>
      <Check className="size-3" strokeWidth={3} />
      LOBB Verified
    </span>
  );
}
