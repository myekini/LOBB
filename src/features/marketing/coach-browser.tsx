"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, Star } from "lucide-react";
import type { CoachPublicProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function CoachBrowser({ coaches, coachCount }: { coaches: CoachPublicProfile[]; coachCount: number }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = coaches[selectedIndex] ?? coaches[0];

  if (!selected) {
    return <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-sm text-[var(--lobb-text-secondary)]">New coaches are being verified across Lagos.</div>;
  }

  return (
    <div className="grid overflow-hidden rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <div
        className="relative flex min-h-[340px] items-center justify-center overflow-hidden px-5 py-14 sm:min-h-[410px] sm:px-10"
        style={{ backgroundImage: "radial-gradient(circle, var(--lobb-border-strong) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      >
        <div className="relative flex flex-col items-center">
          <Link href={`/coaches/${selected.slug ?? selected.id}`} className="mb-7 max-w-[260px] rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 py-3 text-center text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5">
            <span className="block truncate text-lg font-semibold">{selected.full_name}</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--lobb-text-inverse-muted)]">{selected.headline ?? "Tennis coach"}</span>
          </Link>

          <div className="flex items-center justify-center -space-x-3 sm:-space-x-4" role="group" aria-label="Featured coaches">
            {coaches.slice(0, 6).map((coach, index) => {
              const active = index === selectedIndex;
              return (
                <button
                  key={coach.id}
                  type="button"
                  aria-label={`Preview ${coach.full_name}`}
                  aria-pressed={active}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "relative rounded-full outline-none transition-[transform,z-index] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:z-20 hover:-translate-y-1 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[var(--lobb-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lobb-bg-elevated)]",
                    active ? "z-10 -translate-y-2 scale-110" : "z-0"
                  )}
                >
                  <Avatar size="xl" className={cn("size-16 border-[3px] border-[var(--lobb-bg-elevated)] bg-[var(--lobb-bg-secondary)] sm:size-20", active && "ring-2 ring-[var(--lobb-clay)] ring-offset-2 ring-offset-[var(--lobb-bg-elevated)]")}>
                    {coach.profile_photo_url && <AvatarImage src={coach.profile_photo_url} alt="" className="object-cover object-top" />}
                    <AvatarFallback className="text-sm font-semibold text-[var(--lobb-clay)]">{initials(coach.full_name)}</AvatarFallback>
                  </Avatar>
                </button>
              );
            })}
          </div>
          {coachCount > coaches.length && <p className="mt-8 text-xs font-medium text-[var(--lobb-text-secondary)]">Plus {coachCount - coaches.length} more verified coach{coachCount - coaches.length === 1 ? "" : "es"}</p>}
        </div>
      </div>

      <div className="flex flex-col justify-between border-t border-[var(--lobb-border-subtle)] p-5 sm:p-7 lg:border-l lg:border-t-0">
        <div>
          <p className="text-sm font-medium text-[var(--lobb-clay)]">Find your fit</p>
          <h3 className="mt-2 text-xl font-semibold leading-[1.1] tracking-tight">Compare real coaches, quickly.</h3>
          <p className="mt-2.5 max-w-sm text-sm leading-6 text-[var(--lobb-text-secondary)]">Tap a profile to compare style, location and price.</p>
        </div>
        <div className="mt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[var(--lobb-text-secondary)]">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-[var(--lobb-clay)]" />{selected.primary_location ?? "Lagos"}</span>
            <span className="inline-flex items-center gap-1.5"><Star className="size-4 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />{selected.avg_rating != null ? Number(selected.avg_rating).toFixed(1) : "New"}</span>
            {selected.hourly_rate_ngn != null && <span>₦{selected.hourly_rate_ngn.toLocaleString("en-NG")}/hr</span>}
          </div>
          <Link href="/coaches" className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-semibold text-[var(--lobb-text-inverse)] transition-colors duration-300 hover:bg-[var(--lobb-clay)] hover:text-white sm:w-auto">
            Browse all coaches
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
