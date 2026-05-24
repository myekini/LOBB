import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("lobb-skeleton rounded-[12px] bg-[var(--lobb-bg-secondary)]", className)} />;
}

export function CoachCardSkeleton() {
  return (
    <article className="rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-4 shadow-[var(--lobb-shadow-card)]">
      <div className="flex gap-3">
        <SkeletonBlock className="size-[60px] shrink-0 rounded-[16px]" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-10 rounded-[10px]" />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-10 w-20 rounded-full" />
      </div>
    </article>
  );
}

export function SmallCoachCardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] shadow-[var(--lobb-shadow-card)]">
      <SkeletonBlock className="h-[108px] w-full rounded-none rounded-t-[20px]" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-2/3" />
        <SkeletonBlock className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <article className="rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-4 shadow-[var(--lobb-shadow-card)]">
      <SkeletonBlock className="h-4 w-40" />
      <div className="mt-5 flex items-center gap-3">
        <SkeletonBlock className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
      </div>
      <SkeletonBlock className="mt-5 h-8 w-28 rounded-full" />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <SkeletonBlock className="h-10 rounded-full" />
        <SkeletonBlock className="h-10 rounded-full" />
      </div>
    </article>
  );
}

export function PageHeaderSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <SkeletonBlock className={cn("h-3 w-28 rounded-full", compact && "h-2.5 w-20")} />
      <SkeletonBlock className={cn("h-8 w-52 rounded-[12px]", compact && "h-6 w-36")} />
    </div>
  );
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[14px] bg-[var(--lobb-bg-secondary)] p-4 shadow-[var(--lobb-shadow-card)]">
          <SkeletonBlock className="size-8 rounded-[10px]" />
          <SkeletonBlock className="mt-5 h-7 w-16" />
          <SkeletonBlock className="mt-3 h-3 w-24" />
          <SkeletonBlock className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock key={index} className="h-12 rounded-[10px]" />
      ))}
    </div>
  );
}

export function LobbBrandLoader({ message = "Securing your session" }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--lobb-bg-primary)] px-6 text-[var(--lobb-text-primary)]">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex size-20 items-center justify-center rounded-[24px] bg-[var(--lobb-black)] shadow-[0_18px_40px_rgba(13,13,13,0.18)]">
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none" className="lobb-boot-svg">
            <path d="M 8 56 C 8 4 56 4 56 56" stroke="var(--lobb-clay)" strokeWidth="5" strokeLinecap="round" className="lobb-boot-path" />
            <circle cx="32" cy="17" r="6.5" fill="var(--lobb-clay)" className="lobb-boot-circle" />
          </svg>
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.22em]">LOBB</p>
        <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">{message}</p>
      </div>
    </div>
  );
}

export function InlineActionLoader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </span>
  );
}
