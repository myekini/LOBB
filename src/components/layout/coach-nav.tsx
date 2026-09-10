"use client";

import Link from "next/link";
import { CalendarClock, CalendarDays, Home, User, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/coach/dashboard", label: "Home",     icon: Home },
  { href: "/coach/bookings",  label: "Bookings", icon: CalendarDays },
  { href: "/coach/availability", label: "Calendar", icon: CalendarClock },
  { href: "/coach/earnings",  label: "Earnings", icon: WalletCards },
  { href: "/coach/profile",   label: "Profile",  icon: User },
] as const;

type ActiveTab = "home" | "bookings" | "calendar" | "earnings" | "profile" | "settings";

export function CoachBottomNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden">
      <div className="lobb-bottom-nav mx-auto flex max-w-[390px] items-center justify-around p-1.5">
        {items.map((item) => {
          const isActive = item.label.toLowerCase() === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-[52px] flex-1 flex-col items-center justify-center gap-[3px] transition-all duration-200 active:scale-[0.94]",
                isActive
                  ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
                  : "text-[var(--lobb-text-tertiary)]"
              )}
            >
              <Icon
                className={cn(
                  "size-[19px] transition-transform duration-200",
                  isActive ? "scale-110 text-[var(--lobb-clay)]" : "scale-100"
                )}
                strokeWidth={isActive ? 2.5 : 1.85}
              />
              <span className={cn(
                "text-[9px] font-medium tracking-wider uppercase leading-none",
                isActive ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-text-tertiary)]"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CoachDesktopNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="lobb-desktop-nav hidden items-center gap-1 md:flex" aria-label="Coach navigation">
      {items.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 px-4 text-sm font-medium transition",
              isActive
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
                : "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)]"
            )}
          >
            <Icon className={cn("size-4", isActive && "text-[var(--lobb-clay)]")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
