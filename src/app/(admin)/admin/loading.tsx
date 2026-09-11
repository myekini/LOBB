import { MetricGridSkeleton, PageHeaderSkeleton, TableRowsSkeleton } from "@/components/common/lobb-skeleton";

// Mirrors the AdminShell wrapper so there's no layout jump when the page mounts.
export default function AdminLoading() {
  return (
    <main className="lobb-app-page min-h-screen p-3 text-[var(--lobb-text-primary)] md:p-5">
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1380px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] pb-20 md:min-h-[calc(100vh-40px)] lg:pb-0">
        <div className="h-20 border-b border-[var(--lobb-border-subtle)]" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="pt-5">
            <PageHeaderSkeleton />
            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <MetricGridSkeleton />
                <section className="border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
                  <TableRowsSkeleton />
                </section>
              </div>
              <section className="border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
                <TableRowsSkeleton rows={4} />
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
