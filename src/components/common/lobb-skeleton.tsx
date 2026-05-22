import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("lobb-skeleton rounded-[12px] bg-[var(--lobb-surface-2)]", className)} />;
}

export function CoachCardSkeleton() {
  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
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
    <div className="w-full overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]">
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
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
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

