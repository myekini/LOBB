import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type LobbVerifiedBadgeProps = {
  verified: boolean;
  size?: "small" | "large";
  className?: string;
};

export function LobbVerifiedBadge({ verified, size = "small", className }: LobbVerifiedBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay-light)] font-black text-[var(--lobb-clay)]",
        size === "large" ? "px-3 py-1.5 text-[13px]" : "px-2 py-1 text-[12px]",
        className,
      )}
    >
      <Check className={size === "large" ? "size-3.5" : "size-3"} strokeWidth={3} />
      LOBB Verified
    </span>
  );
}
