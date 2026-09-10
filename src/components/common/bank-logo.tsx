"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 rounded-[var(--lobb-radius-md)]",
  md: "size-12 rounded-[var(--lobb-radius-lg)]",
} as const;

/**
 * Square bank badge: the brand logo on a white plate when we have one
 * (see `bankLogosByCode`), otherwise a generic clay glyph. Most logos are
 * transparent PNGs with dark marks, so the plate stays white in both themes
 * (`data-keep-light`).
 */
export function BankLogo({
  logoUrl,
  name,
  size = "md",
  className,
}: {
  logoUrl?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(logoUrl) && !broken;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        SIZES[size],
        showImage
          ? "border border-[var(--lobb-border-subtle)] bg-white p-1.5"
          : "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]",
        className
      )}
      {...(showImage ? { "data-keep-light": "" } : {})}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl as string}
          alt={name ? `${name} logo` : ""}
          className="size-full object-contain"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <Landmark className={size === "sm" ? "size-4" : "size-5"} />
      )}
    </span>
  );
}
