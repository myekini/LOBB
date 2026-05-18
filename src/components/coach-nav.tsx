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
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)]/95 px-2 pb-5 pt-2 shadow-[0_-12px_32px_rgba(13,13,13,0.08)] backdrop-blur md:hidden">
      {items.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[64px] flex-col items-center gap-0.5 rounded-[12px] px-2 py-1.5 text-[var(--lobb-muted)] transition",
              isActive && "bg-[var(--lobb-black)] text-white shadow-[0_8px_20px_rgba(13,13,13,0.18)]"
            )}
          >
            <Icon className="size-[18px]" strokeWidth={isActive ? 2.5 : 1.75} fill={isActive ? "currentColor" : "none"} />
            <span className={cn("text-[10px] font-bold", isActive ? "text-white" : "text-[var(--lobb-muted)]")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
