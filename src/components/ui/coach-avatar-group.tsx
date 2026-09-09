"use client";

import * as React from "react";
import Link from "next/link";
import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachPublicProfile } from "@/lib/types";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

export interface CoachAvatarGroupProps {
  coaches: CoachPublicProfile[];
  total?: number;
  maxShown?: number;
  size?: "md" | "lg" | "xl";
  className?: string;
}

const AVATAR_SIZE_MAP = {
  md: "size-10",
  lg: "size-12",
  xl: "size-14 sm:size-16",
} as const;

export function CoachAvatarGroup({
  coaches,
  total,
  maxShown = 6,
  size = "xl",
  className,
}: CoachAvatarGroupProps) {
  const shown = coaches.slice(0, maxShown);
  const totalCount = total ?? coaches.length;
  const overflow = Math.max(totalCount - shown.length, 0);

  if (shown.length === 0) return null;

  return (
    <AvatarGroup size={size} className={cn("py-2", className)}>
      {shown.map((coach, index) => {
        const profileHref = `/coaches/${coach.slug ?? coach.id}`;
        const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : profileHref;
        const primarySkill = coach.specializations?.[0] ?? coach.skill_levels?.[0] ?? "Tennis coach";
        const ratingLabel = coach.avg_rating != null ? Number(coach.avg_rating).toFixed(1) : "New";
        const initials = coach.full_name
          ? coach.full_name
              .trim()
              .split(/\s+/)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
          : "C";

        return (
          <PreviewCardPrimitive.Root key={coach.id}>
            <PreviewCardPrimitive.Trigger
              render={
                <Link
                  href={profileHref}
                  aria-label={`View ${coach.full_name}'s profile`}
                  style={{ zIndex: shown.length - index }}
                  className={cn(
                    "relative block shrink-0 rounded-full border-2 border-[var(--lobb-bg-primary)] ring-0 transition duration-200 hover:z-30 hover:scale-110 hover:ring-2 hover:ring-[var(--lobb-clay)] focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]",
                    AVATAR_SIZE_MAP[size]
                  )}
                />
              }
            >
              <Avatar
                size={size}
                className="size-full border-0 shadow-[var(--lobb-shadow-card)]"
              >
                {coach.profile_photo_url ? (
                  <AvatarImage
                    src={coach.profile_photo_url}
                    alt={coach.full_name}
                  />
                ) : null}
                <AvatarFallback className="font-semibold text-xs sm:text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </PreviewCardPrimitive.Trigger>

            <PreviewCardPrimitive.Portal>
              <PreviewCardPrimitive.Positioner
                side="top"
                sideOffset={12}
                align="center"
                className="isolate z-50"
              >
                <PreviewCardPrimitive.Popup
                  className="data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2 w-72 origin-(--transform-origin) overflow-hidden rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-0 text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-modal)] duration-150 animate-in fade-in-0 zoom-in-95"
                >
                  <div className="relative h-24 overflow-hidden bg-[var(--lobb-bg-secondary)]">
                    {coach.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coach.profile_photo_url}
                        alt={coach.full_name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-3xl font-semibold text-[var(--lobb-text-tertiary)]">
                        {coach.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {coach.hourly_rate_ngn != null && (
                      <span className="absolute bottom-2 left-3 rounded-[var(--lobb-radius-sm)] bg-[#0d0d0d]/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                        ₦{coach.hourly_rate_ngn.toLocaleString("en-NG")}
                        <span className="font-normal text-white/75">/hr</span>
                      </span>
                    )}
                    <span className="absolute bottom-2 right-3 inline-flex items-center gap-1 rounded-[var(--lobb-radius-sm)] bg-[#0d0d0d]/80 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                      <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                      {ratingLabel}
                    </span>
                  </div>

                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate font-semibold text-[15px] text-[var(--lobb-text-primary)]">
                        {coach.full_name}
                      </h4>
                      <span className="truncate text-[10px] font-medium uppercase tracking-wider text-[var(--lobb-clay)]">
                        {primarySkill}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--lobb-text-secondary)]">
                      {coach.headline ?? "Certified coach ready for bookings across Lagos."}
                    </p>

                    {coach.primary_location && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--lobb-text-tertiary)]">
                        <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
                        <span className="truncate">{coach.primary_location}</span>
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[var(--lobb-border-subtle)]">
                      <Link
                        href={bookingHref}
                        className="flex-1 inline-flex h-8 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] text-xs font-semibold text-white transition hover:bg-[var(--lobb-clay-dark)]"
                      >
                        Book session
                      </Link>
                      <Link
                        href={profileHref}
                        className="inline-flex h-8 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-2.5 text-xs font-medium text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)]"
                      >
                        Profile <ArrowRight className="ml-1 size-3" />
                      </Link>
                    </div>
                  </div>
                </PreviewCardPrimitive.Popup>
              </PreviewCardPrimitive.Positioner>
            </PreviewCardPrimitive.Portal>
          </PreviewCardPrimitive.Root>
        );
      })}

      {overflow > 0 && (
        <Link
          href="/coaches"
          aria-label={`Browse all ${totalCount} coaches`}
          className="group relative z-10 block transition hover:scale-110 focus-visible:outline-none"
        >
          <AvatarGroupCount
            size={size}
            className="cursor-pointer font-bold text-xs sm:text-sm group-hover:bg-[var(--lobb-clay-dark)]"
          >
            +{overflow}
          </AvatarGroupCount>
        </Link>
      )}
    </AvatarGroup>
  );
}
