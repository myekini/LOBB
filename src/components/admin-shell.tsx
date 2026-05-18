"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Gavel, LayoutDashboard, LogOut, UserCheck, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/coaches", label: "Coach Approvals", icon: UserCheck },
  { href: "/admin/bookings", label: "All Bookings", icon: CalendarDays },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
  { href: "/admin/earnings", label: "Platform Earnings", icon: WalletCards },
] as const;

export function AdminShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] text-[var(--lobb-black)]">
      <header className="sticky top-0 z-50 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/admin" className="text-lg font-black tracking-tight">LOBB Admin</Link>
          <button className="inline-flex items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-2 text-sm font-black">
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <nav className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
            <p className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Platform Management</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.label === active;
              return (
                <Link key={`${item.href}-${item.label}`} href={item.href} className={cn("mt-1 flex items-center gap-3 rounded-[14px] px-3 py-3 text-sm font-black text-[var(--lobb-muted)]", isActive && "bg-[var(--lobb-black)] text-white")}>
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

export function AdminBackHeader({ title, href = "/admin" }: { title: string; href?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Link href={href} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="text-[22px] font-black md:text-2xl">{title}</h1>
    </div>
  );
}
