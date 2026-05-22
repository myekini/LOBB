import type React from "react";
import { cn } from "@/lib/utils";

export function CoachSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function CoachKicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">{children}</p>;
}
