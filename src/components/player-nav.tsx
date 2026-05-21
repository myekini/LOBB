"use client";

import Link from "next/link";
import { CalendarDays, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/",         label: "Home",     icon: Home },
  { href: "/coaches",  label: "Browse",   icon: Search },
  { href: "/dashboard", label: "Bookings", icon: CalendarDays },
  { href: "/profile",  label: "Profile",  icon: User },
] as const;

type ActiveTab = "home" | "browse" | "bookings" | "profile";

export function PlayerBottomNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 md:hidden">
      <div className="mx-auto flex max-w-[430px] items-center justify-between rounded-[24px] border border-black/10 bg-[rgba(250,250,250,0.88)] p-1.5 shadow-[0_-10px_34px_rgba(13,13,13,0.13)] backdrop-blur-2xl">
        {items.map((item) => {
          const isActive = item.label.toLowerCase() === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex h-[58px] flex-1 flex-col items-center justify-center gap-1 rounded-[18px] text-[var(--lobb-muted)] transition active:scale-[0.98]",
                isActive && "bg-[var(--lobb-black)] text-white shadow-[0_10px_26px_rgba(13,13,13,0.2)]"
              )}
            >
              <Icon
                className="size-[19px]"
                strokeWidth={isActive ? 2.45 : 1.85}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className={cn("text-[10px] font-black leading-none", isActive ? "text-white" : "text-[var(--lobb-muted)]")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
