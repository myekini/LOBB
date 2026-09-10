"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Gavel, LayoutDashboard, Loader2, LogOut, RefreshCw, UserCheck, Users, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/theme-toggle";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/coaches", label: "Coaches", icon: UserCheck },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/earnings", label: "Earnings", icon: WalletCards },
  { href: "/admin/disputes", label: "Disputes", icon: Gavel },
] as const;

function useIsActive() {
  const pathname = usePathname() ?? "/admin";
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isActive = useIsActive();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <main className="lobb-app-page min-h-screen text-[var(--lobb-text-primary)]">
      <div className="mx-auto min-h-screen max-w-[1440px] bg-[var(--lobb-bg-primary)] pb-20 lg:pb-0">
      <header className="lobb-app-header sticky top-0 z-50 border-b border-[var(--lobb-border-subtle)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="" className="size-9" />
            </span>
            <span>
              <span className="block text-[15px] font-medium tracking-tight">LOBB</span>
              <span className="hidden text-[11px] font-bold text-[var(--lobb-text-secondary)] sm:block">Admin</span>
            </span>
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Admin navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-[var(--lobb-radius-md)] px-3 text-sm font-medium transition",
                    active
                      ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
                      : "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-elevated)] hover:text-[var(--lobb-text-primary)]"
                  )}
                >
                  <Icon className={cn("size-4", active && "text-[var(--lobb-clay)]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle className="size-10 rounded-[var(--lobb-radius-md)]" />
            <LobbButton variant="unstyled" onClick={signOut} disabled={signingOut} className="inline-flex h-10 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 text-sm font-semibold transition-colors hover:border-[var(--lobb-clay)]/35 disabled:opacity-60">
              {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              <span className="hidden sm:inline">{signingOut ? "Signing out" : "Sign out"}</span>
            </LobbButton>
          </div>
        </div>
      </header>
      <div className="px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <section className="min-w-0">{children}</section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]/95 px-3 py-2 backdrop-blur-xl lg:hidden" aria-label="Admin mobile navigation">
        <div className="mx-auto flex max-w-md overflow-x-auto [scrollbar-width:none]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex h-14 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--lobb-radius-md)] text-[10px] font-medium text-[var(--lobb-text-tertiary)]", active && "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]")}>
                <Icon className={cn("size-4", active && "text-[var(--lobb-clay)]")} />
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

export function AdminBackHeader({ title, href = "/admin", action }: { title: string; href?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 lg:flex">
      <Link href={href} className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)]" aria-label="Go back">
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="truncate text-center text-[22px] font-semibold md:text-2xl lg:text-left lg:flex-1">{title}</h1>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

export function AdminRefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <LobbButton
      variant="unstyled"
      onClick={onClick}
      disabled={busy}
      aria-label="Refresh"
      className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] disabled:opacity-60 lg:size-9 lg:rounded-[var(--lobb-radius-md)]"
    >
      <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
    </LobbButton>
  );
}
