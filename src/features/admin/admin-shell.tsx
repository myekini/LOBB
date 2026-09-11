"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Gavel, LayoutDashboard, Loader2, LogOut, RefreshCw, UserCheck, Users, WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { showLobbToast } from "@/providers/lobb-global-state";
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

// ─────────────────────────────────────────────────────────────────────────────
// Standard admin page primitives. Every admin page composes these so headers,
// metric tiles and empty states stay identical across the section.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One page header for the whole admin section. `eyebrow` is the small clay
 * kicker, `backHref` renders the round back button, `children` is the right-hand
 * action slot (usually <AdminRefreshButton />).
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]"
          >
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-clay)]">{eyebrow}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1.5 text-sm font-medium text-[var(--lobb-text-secondary)]">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Metric tile used in every admin stat grid. */
export function AdminMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  urgent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "clay" | "success";
  urgent?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
      : tone === "clay"
        ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]"
        : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]";

  return (
    <div
      className={cn(
        "lobb-surface-outlined border p-4",
        urgent
          ? "border-[var(--lobb-warning)]/45 bg-[var(--lobb-warning)]/10"
          : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]"
      )}
    >
      {icon && (
        <span className={cn("mb-4 flex size-8 items-center justify-center rounded-[var(--lobb-radius-md)]", toneClass)}>
          {icon}
        </span>
      )}
      <p className="text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{hint}</p>}
    </div>
  );
}

/** Dashed placeholder for "nothing here yet" states. */
export function AdminEmptyState({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-8 text-center",
        className
      )}
    >
      {Icon && <Icon className="mx-auto size-5 text-[var(--lobb-text-secondary)]" />}
      <p className={cn("text-base font-medium", Icon && "mt-3")}>{title}</p>
      {body && (
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">{body}</p>
      )}
    </div>
  );
}

/**
 * Shared loader for the simple admin pages (one GET returning the whole payload).
 * Pages with cursors/filters keep their own fetch loop but still use the
 * primitives above. Errors surface as a toast; `reload("refresh")` drives the
 * spinner on <AdminRefreshButton />.
 */
export function useAdminResource<T>(url: string, { immediate = true }: { immediate?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch(url);
        const json = (await res.json()) as T & { error?: string };
        if (!res.ok) throw new Error(json?.error ?? "Something went wrong");
        setData(json);
      } catch (error) {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Something went wrong" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [url]
  );

  useEffect(() => {
    if (immediate) reload("initial");
  }, [reload, immediate]);

  return { data, loading, refreshing, reload };
}
