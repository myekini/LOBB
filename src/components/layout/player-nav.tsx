"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, Home, LogOut, Search, Settings, User } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { showLobbToast } from "@/providers/lobb-global-state";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home",     icon: Home },
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
              key={item.label}
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
  const desktopItems = items.filter((item) => item.label !== "Profile");

  return (
    <nav className="lobb-desktop-nav hidden items-center gap-1 md:flex" aria-label="Player navigation">
      {desktopItems.map((item) => {
        const isActive = item.label.toLowerCase() === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
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

type PlayerMenuProfile = {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

function PlayerAccountMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<PlayerMenuProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      setProfile({
        full_name: data?.full_name ?? null,
        avatar_url: data?.avatar_url ?? null,
        email: data?.email ?? user.email ?? null,
      });
    });

    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const logout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out");
      window.location.href = "/auth/login";
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not log out" });
      setBusy(false);
    }
  };

  const initials = profile?.full_name
    ?.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") ?? null;
  const firstName = profile?.full_name?.split(" ")[0] || "Account";

  return (
    <div ref={menuRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open account menu"
        className="flex h-10 items-center gap-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] py-1 pl-1 pr-2 text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] transition hover:border-[var(--lobb-clay)]/40"
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[var(--lobb-clay)] text-white text-[11px] font-black">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : initials ? (
            initials
          ) : (
            <User className="size-4" />
          )}
        </span>
        <span className="hidden max-w-20 truncate text-xs font-black md:block">{firstName}</span>
        <ChevronDown className="size-3.5 text-[var(--lobb-text-tertiary)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[20px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2 shadow-[var(--lobb-shadow-modal)]">
          <div className="flex items-center gap-3 border-b border-[var(--lobb-border-subtle)] p-3">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--lobb-clay)] text-white text-sm font-black">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : initials ? (
                initials
              ) : (
                <User className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{profile?.full_name ?? "Player"}</p>
              <p className="truncate text-[11px] font-semibold text-[var(--lobb-text-secondary)]">{profile?.email ?? "LOBB player"}</p>
            </div>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-black text-[var(--lobb-text-primary)] transition hover:bg-[var(--lobb-bg-secondary)]"
          >
            <span className="text-[var(--lobb-clay)]"><User className="size-4" /></span>
            Profile
          </Link>
          <Link
            href="/profile/edit"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-black text-[var(--lobb-text-primary)] transition hover:bg-[var(--lobb-bg-secondary)]"
          >
            <span className="text-[var(--lobb-clay)]"><Settings className="size-4" /></span>
            Edit profile
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="mt-1 flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-sm font-black text-[var(--lobb-error)] transition hover:bg-[var(--lobb-bg-secondary)] disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
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
            href="/dashboard"
            aria-label="LOBB home"
            className="lobb-logo-shell flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
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
          <PlayerAccountMenu />
        </div>
      </div>
    </header>
  );
}
