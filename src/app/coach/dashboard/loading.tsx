import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";

export default function CoachDashboardLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Dashboard" eyebrow="LOBB Coach" active="home" />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <section className="mb-5 overflow-hidden rounded-[26px] bg-[var(--lobb-bg-inverse)] px-5 py-6 shadow-[var(--lobb-shadow-modal)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="size-11 rounded-[16px] bg-white/10" />
                <SkeletonBlock className="h-9 w-28 rounded-full bg-white/10" />
              </div>
              <SkeletonBlock className="mt-5 h-10 max-w-xl bg-white/10 sm:h-12" />
              <SkeletonBlock className="mt-3 h-4 max-w-2xl bg-white/10" />
            </div>
            <SkeletonBlock className="h-9 w-44 rounded-full bg-white/10" />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4">
            <SkeletonBlock className="h-[150px] rounded-[18px]" />
            <CoachSurface className="p-4">
              <SkeletonBlock className="h-4 w-28" />
              <div className="mt-5 flex items-center gap-3">
                <SkeletonBlock className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-36" />
                </div>
              </div>
            </CoachSurface>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-[150px] rounded-[18px]" />
              ))}
            </div>

            <section className="rounded-[18px] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-44" />
                </div>
                <SkeletonBlock className="h-4 w-12" />
              </div>
              <div className="mt-4 grid gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-14 rounded-[12px]" />
                ))}
              </div>
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
