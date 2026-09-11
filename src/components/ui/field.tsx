import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, children, className }: { label?: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      {label ? <span className="text-sm font-medium text-[var(--lobb-text-primary)]">{label}</span> : null}
      {children}
      {error ? <span className="text-xs font-medium text-[var(--lobb-error)]">{error}</span> : hint ? <span className="text-xs text-[var(--lobb-text-secondary)]">{hint}</span> : null}
    </label>
  );
}
