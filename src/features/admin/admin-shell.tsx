"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Gavel, LayoutDashboard, LogOut, UserCheck, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/coaches", label: "Coach Approvals", icon: UserCheck },
  { href: "/admin/bookings", label: "All Bookings", icon: CalendarDays },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
  { href: "/admin/earnings", label: "Platform Earnings", icon: WalletCards },
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
    <main className="min-h-screen bg-[var(--lobb-bg)] text-[var(--lobb-black)]">
      <header className="sticky top-0 z-50 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-[var(--lobb-black)] text-[11px] font-black text-white">LA</span>
            <span>
              <span className="block text-sm font-black tracking-tight">LOBB Admin</span>
              <span className="hidden text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)] sm:block">Control room</span>
            </span>
          </Link>
          <AdminDesktopNav active={active} />
          <button onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-sm font-black shadow-[0_8px_22px_rgba(13,13,13,0.05)]">
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[250px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
            <p className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Platform Management</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.label === active;
              return (
                <Link key={`${item.href}-${item.label}`} href={item.href} className={cn("mt-1 flex items-center gap-3 rounded-[14px] px-3 py-3 text-sm font-black text-[var(--lobb-muted)] transition hover:bg-[var(--lobb-bg)] hover:text-[var(--lobb-black)]", isActive && "bg-[var(--lobb-black)] text-white hover:bg-[var(--lobb-black)] hover:text-white")}>
                  <Icon className={cn("size-4", isActive && "text-[var(--lobb-clay)]")} />
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

function AdminDesktopNav({ active }: { active: string }) {
  return (
    <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Admin navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.label === active;
        return (
          <Link
            key={item.href}
            href={item.href}
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

export function AdminBackHeader({ title, href = "/admin" }: { title: string; href?: string }) {
  return (
    <div className="mb-6 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 lg:flex">
      <Link href={href} className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_8px_22px_rgba(13,13,13,0.05)]" aria-label="Go back">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="truncate text-center text-[22px] font-black md:text-2xl lg:text-left">{title}</h1>
      <div aria-hidden="true" />
    </div>
  );
}
