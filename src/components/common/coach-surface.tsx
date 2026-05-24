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
        "rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] shadow-[var(--lobb-shadow-card)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function CoachKicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-secondary)]">{children}</p>;
}
