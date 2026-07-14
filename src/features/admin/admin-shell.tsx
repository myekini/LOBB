"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Gavel, LayoutDashboard, LogOut, UserCheck, Users, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/coaches", label: "Coaches", icon: UserCheck },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/earnings", label: "Earnings", icon: WalletCards },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
] as const;

export function AdminShell({ children, active = "Dashboard" }: { children: React.ReactNode; active?: string }) {
  const router = useRouter();
  const signOut = async () => {
    const supabase = createClient();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <main className="lobb-app-page min-h-screen p-3 text-[var(--lobb-text-primary)] md:p-5">
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1380px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] pb-20 md:min-h-[calc(100vh-40px)] md:pb-0">
      <header className="lobb-app-header sticky top-3 z-50 border-b border-[var(--lobb-border-subtle)] backdrop-blur-xl md:top-5">
        <div className="flex h-20 items-center justify-between gap-4 px-5 sm:px-7">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--lobb-black)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="" className="size-9" />
            </span>
            <span>
              <span className="block text-[15px] font-black tracking-tight">LOBB</span>
              <span className="hidden text-[11px] font-bold text-[var(--lobb-text-secondary)] sm:block">Admin</span>
            </span>
          </Link>
          <AdminDesktopNav active={active} />
          <button onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 text-sm font-black transition-colors hover:border-[var(--lobb-clay)]/35">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>
      <div className="px-5 pb-6 sm:px-7">
        <section className="min-w-0">{children}</section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]/95 px-3 py-2 backdrop-blur-xl md:hidden" aria-label="Admin mobile navigation">
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active || (active === "Coach Approvals" && item.label === "Coaches") || (active === "All Bookings" && item.label === "Bookings") || (active === "Platform Earnings" && item.label === "Earnings");
            return (
              <Link key={item.href} href={item.href} className={cn("flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] text-[10px] font-black text-[var(--lobb-text-tertiary)]", isActive && "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]")}>
                <Icon className={cn("size-4", isActive && "text-[var(--lobb-clay)]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      </div>
    </main>
  );
}

function AdminDesktopNav({ active }: { active: string }) {
  return (
    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Admin navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.label === active || (active === "Coach Approvals" && item.label === "Coaches") || (active === "All Bookings" && item.label === "Bookings") || (active === "Platform Earnings" && item.label === "Earnings");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-[12px] px-4 text-sm font-bold transition",
              isActive
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                : "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-elevated)] hover:text-[var(--lobb-text-primary)]"
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

export function AdminBackHeader({ title, href = "/admin" }: { title: string; href?: string }) {
  return (
    <div className="mb-6 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 lg:flex">
      <Link href={href} className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)]" aria-label="Go back">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="truncate text-center text-[22px] font-black md:text-2xl lg:text-left">{title}</h1>
      <div aria-hidden="true" />
    </div>
  );
}
