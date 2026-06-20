"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Home, Pencil, type LucideIcon } from "lucide-react";
import { CoachAccountMenu } from "@/components/common/coach-account-menu";
import { CoachDesktopNav } from "@/components/layout/coach-nav";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

type CoachHeaderActionIcon = "calendar" | "pencil";

type CoachFlowHeaderProps = {
  title: string;
  eyebrow?: string;
  active?: "home" | "bookings" | "earnings" | "profile";
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: CoachHeaderActionIcon;
  showLogout?: boolean;
  confirmNavigation?: boolean;
  confirmMessage?: string;
  className?: string;
};

const actionIcons: Record<CoachHeaderActionIcon, LucideIcon> = {
  calendar: CalendarDays,
  pencil: Pencil,
};

export function CoachFlowHeader({
  title,
  eyebrow,
  active,
  actionHref,
  actionLabel,
  actionIcon,
  showLogout = true,
  confirmNavigation = false,
  confirmMessage = "Discard unsaved changes?",
  className,
}: CoachFlowHeaderProps) {
  const router = useRouter();
  const canNavigate = () => !confirmNavigation || window.confirm(confirmMessage);
  const ActionIcon = actionIcon ? actionIcons[actionIcon] : null;

  return (
    <header
      className={cn(
        "lobb-app-header sticky top-0 z-40 -mx-5 border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/92 px-5 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {active ? (
            <div className="flex items-center gap-2">
              <Link
                href="/coach/dashboard"
                aria-label="Coach home"
                className="lobb-logo-shell flex size-10 items-center justify-center overflow-hidden rounded-[12px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/favicon.svg" alt="" className="size-full" />
              </Link>
              <div className="hidden min-[380px]:block">
                {eyebrow && <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-secondary)]">{eyebrow}</p>}
                <h1 className="truncate text-base font-black">{title}</h1>
              </div>
            </div>
          ) : (
            <>
              <IconButton label="Back" onClick={() => canNavigate() && router.back()} icon={ArrowLeft} />
              <button
                type="button"
                onClick={() => {
                  if (canNavigate()) router.push("/coach/dashboard");
                }}
                className="flex size-10 items-center justify-center border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.97]"
                aria-label="Coach home"
              >
                <Home className="size-4" />
              </button>
            </>
          )}
        </div>

        <div className={cn("min-w-0 flex-1 text-center", active && "min-[380px]:hidden")}>
          {eyebrow && <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-secondary)]">{eyebrow}</p>}
          <h1 className="truncate text-base font-black">{title}</h1>
        </div>

        {active && <CoachDesktopNav active={active} />}

        <div className="flex items-center gap-2">
          {actionHref && actionLabel && (
            <button
              type="button"
              onClick={() => {
                if (canNavigate()) router.push(actionHref);
              }}
              className="flex h-10 items-center gap-1.5 bg-[var(--lobb-bg-inverse)] px-3 text-xs font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
            >
              {ActionIcon && <ActionIcon className="size-3.5" />}
              <span className="hidden min-[380px]:inline">{actionLabel}</span>
            </button>
          )}
          <ThemeToggle className="size-10 rounded-[12px]" />
          {showLogout && <CoachAccountMenu />}
        </div>
      </div>
    </header>
  );
}

function IconButton({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-10 items-center justify-center border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.97]"
      aria-label={label}
    >
      <Icon className="size-4" />
    </button>
  );
}
