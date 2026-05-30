"use client";

import Link from "next/link";
import { CalendarDays, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/theme-toggle";

const items = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/coaches",  label: "Browse",   icon: Search },
  { href: "/dashboard", label: "Bookings", icon: CalendarDays },
  { href: "/profile",  label: "Profile",  icon: User },
] as const;

type ActiveTab = "home" | "browse" | "bookings" | "profile";

export function PlayerBottomNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 md:hidden">
      <div className="mx-auto flex max-w-[390px] items-center justify-between rounded-[24px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1.5 shadow-[var(--lobb-shadow-sheet)] backdrop-blur-3xl animate-in slide-in-from-bottom-5 duration-500 fill-mode-both">
        {items.map((item) => {
          const isActive = item.label.toLowerCase() === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[var(--lobb-text-tertiary)] transition-all duration-300 active:scale-[0.95]",
                isActive ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]" : "hover:text-[var(--lobb-text-primary)]"
              )}
            >
              <Icon
                className={cn("size-[18px] transition-transform duration-300 group-hover:scale-105", isActive && "text-[var(--lobb-clay)]")}
                strokeWidth={isActive ? 2.5 : 1.85}
              />
              <span className={cn(
                "text-[9px] font-black tracking-wider uppercase leading-none transition-colors",
                isActive ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-text-tertiary)]"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 size-1.5 rounded-full bg-[var(--lobb-clay)] animate-pulse" />
              )}
            </Link>
          );
        })}
        <ThemeToggle className="h-[54px] flex-1 rounded-[18px] border-0 bg-transparent" />
      </div>
    </nav>
  );
}

export function PlayerDesktopNav({ active }: { active: ActiveTab }) {
  const desktopItems = items.filter((item) => item.label !== "Profile");
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Player navigation">
      {desktopItems.map((item) => {
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
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
                : "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)]"
            )}
          >
            <Icon className={cn("size-4", isActive && "text-[var(--lobb-clay)]")} />
            {item.label}
          </Link>
        );
      })}
      <ThemeToggle />
    </nav>
  );
}
