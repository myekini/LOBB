"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "info" | "warning";

const variants: Record<
  AlertVariant,
  { Icon: LucideIcon; wrap: string; icon: string; title: string }
> = {
  error: {
    Icon: XCircle,
    wrap: "border-[var(--lobb-error)]/25 bg-[var(--lobb-error)]/[0.07]",
    icon: "text-[var(--lobb-error)]",
    title: "text-[var(--lobb-error)]",
  },
  success: {
    Icon: CheckCircle2,
    wrap: "border-[var(--lobb-success)]/25 bg-[var(--lobb-success)]/[0.07]",
    icon: "text-[var(--lobb-success)]",
    title: "text-[var(--lobb-success)]",
  },
  info: {
    Icon: Info,
    wrap: "border-[var(--lobb-clay)]/25 bg-[var(--lobb-clay)]/[0.06]",
    icon: "text-[var(--lobb-clay)]",
    title: "text-[var(--lobb-clay)]",
  },
  warning: {
    Icon: AlertTriangle,
    wrap: "border-[var(--lobb-star)]/30 bg-[var(--lobb-star)]/[0.08]",
    icon: "text-[var(--lobb-star)]",
    title: "text-[var(--lobb-star)]",
  },
};

/**
 * Standard inline alert for forms — shadcn-Alert-style card, calm instead of
 * bare red text. Use for validation/submit errors, success confirmations, and
 * contextual notices near the action that caused them.
 */
export function FormAlert({
  variant = "error",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { Icon, wrap, icon, title: titleColor } = variants[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[14px] border p-3.5 text-left",
        wrap,
        className
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div className="min-w-0 flex-1">
        {title && (
          <p className={cn("text-[12px] font-black leading-snug", titleColor)}>{title}</p>
        )}
        <div
          className={cn(
            "text-[12.5px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]",
            title && "mt-0.5"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
