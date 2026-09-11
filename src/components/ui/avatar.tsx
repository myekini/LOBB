"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: "sm" | "md" | "lg" | "xl";
}

const AVATAR_SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};

/**
 * Root Avatar primitive wrapper matching shadcn/base-ui.
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <AvatarPrimitive.Root
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] font-medium select-none",
          AVATAR_SIZES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = "", ...props }, ref) => {
    return (
      <AvatarPrimitive.Image
        ref={ref}
        alt={alt}
        data-slot="avatar-image"
        className={cn("aspect-square size-full object-cover", className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>;

export const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <AvatarPrimitive.Fallback
        ref={ref}
        data-slot="avatar-fallback"
        className={cn(
          "flex size-full items-center justify-center bg-[var(--lobb-bg-secondary)] font-medium text-[var(--lobb-text-secondary)]",
          className
        )}
        {...props}
      >
        {children ?? <User className="size-1/2" />}
      </AvatarPrimitive.Fallback>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export interface AvatarGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  size?: "sm" | "md" | "lg" | "xl";
}

const GROUP_SPACING: Record<NonNullable<AvatarGroupProps["size"]>, string> = {
  sm: "-space-x-2",
  md: "-space-x-3",
  lg: "-space-x-4",
  xl: "-space-x-5",
};

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="avatar-group"
        className={cn("flex items-center", GROUP_SPACING[size], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";

export interface AvatarGroupCountProps extends React.ComponentPropsWithoutRef<"span"> {
  size?: "sm" | "md" | "lg" | "xl";
}

export const AvatarGroupCount = React.forwardRef<HTMLSpanElement, AvatarGroupCountProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="avatar-group-count"
        className={cn(
          "relative z-0 flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--lobb-bg-primary)] bg-[var(--lobb-clay)] font-semibold text-white shadow-sm transition hover:scale-105 hover:bg-[var(--lobb-clay-dark)]",
          AVATAR_SIZES[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AvatarGroupCount.displayName = "AvatarGroupCount";
