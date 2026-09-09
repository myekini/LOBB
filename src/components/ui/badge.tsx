import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-secondary)] px-3 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}
