"use client";

import Link from "next/link";
import { CalendarDays, Home, User, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/coach/dashboard", label: "Home", icon: Home },
  { href: "/coach/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/coach/earnings", label: "Earnings", icon: WalletCards },
  { href: "/coach/profile", label: "Profile", icon: User },
] as const;

type ActiveTab = "home" | "bookings" | "earnings" | "profile";

export function CoachBottomNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 md:hidden">
      <div className="mx-auto flex max-w-[390px] items-center justify-between rounded-[28px] border border-black/[0.06] bg-white/80 p-1.5 shadow-[0_16px_48px_rgba(13,13,13,0.16)] backdrop-blur-3xl animate-in slide-in-from-bottom-5 duration-500 fill-mode-both">
        {items.map((item) => {
          const isActive = item.label.toLowerCase() === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] text-[var(--lobb-muted)] transition-all duration-300 active:scale-[0.95]",
                isActive ? "text-[var(--lobb-black)] bg-black/[0.03]" : "hover:text-[var(--lobb-black)]"
              )}
            >
              <Icon
                className={cn("size-[18px] transition-transform duration-300 group-hover:scale-105", isActive && "text-[var(--lobb-clay)]")}
                strokeWidth={isActive ? 2.5 : 1.85}
              />
              <span className={cn(
                "text-[9px] font-black tracking-wider uppercase leading-none transition-colors",
                isActive ? "text-[var(--lobb-black)]" : "text-[var(--lobb-muted)]"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 size-1.5 rounded-full bg-[var(--lobb-clay)] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CoachDesktopNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Coach navigation">
      {items.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition",
              isActive
                ? "bg-[var(--lobb-black)] text-white shadow-[0_10px_24px_rgba(13,13,13,0.14)]"
                : "text-[var(--lobb-muted)] hover:bg-[var(--lobb-surface)] hover:text-[var(--lobb-black)]"
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
