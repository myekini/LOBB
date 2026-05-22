"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home, type LucideIcon } from "lucide-react";
import { CoachLogoutButton } from "@/components/common/coach-logout-button";
import { CoachDesktopNav } from "@/components/layout/coach-nav";
import { cn } from "@/lib/utils";

type CoachFlowHeaderProps = {
  title: string;
  eyebrow?: string;
  active?: "home" | "bookings" | "earnings" | "profile";
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  showLogout?: boolean;
  confirmNavigation?: boolean;
  confirmMessage?: string;
  className?: string;
};

export function CoachFlowHeader({
  title,
  eyebrow,
  active,
  actionHref,
  actionLabel,
  actionIcon: ActionIcon,
  showLogout = true,
  confirmNavigation = false,
  confirmMessage = "Discard unsaved changes?",
  className,
}: CoachFlowHeaderProps) {
  const router = useRouter();
  const canNavigate = () => !confirmNavigation || window.confirm(confirmMessage);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 -mx-5 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/92 px-5 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton label="Back" onClick={() => canNavigate() && router.back()} icon={ArrowLeft} />
          <button
            type="button"
            onClick={() => {
              if (canNavigate()) router.push("/coach/dashboard");
            }}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] shadow-[0_8px_20px_rgba(13,13,13,0.05)] transition active:scale-[0.97]"
            aria-label="Coach home"
          >
            <Home className="size-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1 text-center">
          {eyebrow && <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">{eyebrow}</p>}
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
              className="flex h-10 items-center gap-1.5 rounded-full bg-[var(--lobb-black)] px-3 text-xs font-black text-white shadow-[0_10px_24px_rgba(13,13,13,0.14)]"
            >
              {ActionIcon && <ActionIcon className="size-3.5" />}
              <span className="hidden min-[380px]:inline">{actionLabel}</span>
            </button>
          )}
          {showLogout && <CoachLogoutButton compact />}
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
      className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] shadow-[0_8px_20px_rgba(13,13,13,0.05)] transition active:scale-[0.97]"
      aria-label={label}
    >
      <Icon className="size-4" />
    </button>
  );
}
