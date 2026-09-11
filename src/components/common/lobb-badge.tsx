import { VerifiedBadge } from "@/components/ui/status-badge";

type LobbVerifiedBadgeProps = {
  verified: boolean;
  size?: "small" | "large";
  className?: string;
};

export function LobbVerifiedBadge({ verified, size = "small", className }: LobbVerifiedBadgeProps) {
  if (!verified) return null;
  return <VerifiedBadge className={`${size === "large" ? "px-3 py-1.5 text-[13px]" : ""} ${className ?? ""}`} />;
}
