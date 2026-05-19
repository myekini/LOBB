import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full bg-[var(--lobb-surface-2)] px-3 py-1 text-xs font-black", className)}>
      {children}
    </span>
  );
}
