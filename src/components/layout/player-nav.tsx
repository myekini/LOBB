"use client";

"use client";

import Link from "next/link";
import type React from "react";
import { ArrowLeft, CalendarDays, Home, Search, User } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

const items = [
  { href: "/",          label: "Home",     icon: Home },
  { href: "/coaches",   label: "Coaches",  icon: Search },
  { href: "/dashboard", label: "Bookings", icon: CalendarDays },
  { href: "/profile",   label: "Profile",  icon: User },
] as const;

type ActiveTab = "home" | "coaches" | "bookings" | "profile";

type PlayerHeaderProps = {
  active: ActiveTab;
  title: string;
  backHref?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  sticky?: boolean;
};

export function PlayerBottomNav({ active }: { active: ActiveTab }) {
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
                "text-[9px] font-black tracking-wider uppercase leading-none",
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

export function PlayerDesktopNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="lobb-desktop-nav hidden items-center gap-1 md:flex" aria-label="Player navigation">
      {items.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 px-4 text-sm font-black transition",
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

export function PlayerHeader({
  active,
  title,
  backHref,
  eyebrow,
  actions,
  sticky = true,
}: PlayerHeaderProps) {
  return (
    <header
      className={cn(
        "lobb-app-header z-40 border-b border-[var(--lobb-border-subtle)] backdrop-blur-xl",
        sticky && "sticky top-0"
      )}
    >
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 md:flex md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            aria-label="LOBB home"
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--lobb-bg-inverse)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="" className="size-full" />
          </Link>
          {backHref && (
            <Link
              href={backHref}
              aria-label="Go back"
              className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/40 active:scale-[0.97]"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <div className="hidden min-w-0 md:block">
            {eyebrow && (
              <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                {eyebrow}
              </p>
            )}
            <p className="truncate text-sm font-black text-[var(--lobb-text-primary)]">{title}</p>
          </div>
        </div>

        <div className="min-w-0 text-center md:hidden">
          {eyebrow && (
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-[15px] font-black text-[var(--lobb-text-primary)]">{title}</h1>
        </div>

        <PlayerDesktopNav active={active} />

        <div className="flex items-center justify-end gap-2">
          {actions}
          <ThemeToggle className="size-10 rounded-[12px]" />
        </div>
      </div>
    </header>
  );
}
