import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";
import { CoachBottomNav } from "@/components/layout/coach-nav";

export default function CoachDashboardLoading() {
  return (
    <main className="lobb-app-page min-h-screen px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Dashboard" eyebrow="LOBB Coach" active="home" />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <section className="mb-5 overflow-hidden bg-[#0D0D0D] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <SkeletonBlock className="h-3.5 w-28 bg-white/10" />
              <SkeletonBlock className="mt-3 h-9 w-52 bg-white/10 sm:h-10" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:w-[340px]">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[60px] rounded-[12px] bg-white/10" />
              ))}
            </div>
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

            <section className="lobb-app-card bg-[var(--lobb-bg-elevated)] p-4">
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
      <CoachBottomNav active="home" />
    </main>
  );
}
