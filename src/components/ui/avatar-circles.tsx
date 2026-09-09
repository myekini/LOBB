"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarCircleItem = {
  src?: string | null;
  alt?: string;
};

interface AvatarCirclesProps {
  avatars: AvatarCircleItem[];
  /** Total count the stack represents — shows a "+N" bubble for the remainder. Omit to hide it. */
  total?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarCirclesProps["size"]>, string> = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-[11px]",
  lg: "size-12 text-xs",
};

const MAX_SHOWN = 5;

/** Overlapping circular avatar stack with a "+N" overflow bubble — social proof for a real, counted group (coaches, players, reviewers). */
export function AvatarCircles({ avatars, total, size = "md", className }: AvatarCirclesProps) {
  const shown = avatars.slice(0, MAX_SHOWN);
  const extra = total != null ? Math.max(total - shown.length, 0) : 0;
  const sizeClass = SIZE_CLASSES[size];

  if (shown.length === 0) return null;

  return (
    <div className={cn("flex -space-x-3", className)}>
      {shown.map((avatar, index) => (
        <span
          key={index}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-full border-2 border-[var(--lobb-bg)] bg-[var(--lobb-bg-secondary)]",
            sizeClass,
          )}
          style={{ zIndex: shown.length - index }}
        >
          {avatar.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.src} alt={avatar.alt ?? ""} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[var(--lobb-text-secondary)]">
              <User className="size-1/2" />
            </span>
          )}
        </span>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--lobb-bg)] bg-[var(--lobb-clay)] font-semibold text-white",
            sizeClass,
          )}
          style={{ zIndex: 0 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
