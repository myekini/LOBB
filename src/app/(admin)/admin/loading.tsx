import { MetricGridSkeleton, PageHeaderSkeleton, TableRowsSkeleton } from "@/components/common/lobb-skeleton";

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-secondary)] p-3 text-[var(--lobb-text-primary)] md:p-5">
      <div className="mx-auto min-h-[calc(100vh-24px)] max-w-[1380px] rounded-[20px] bg-[var(--lobb-bg-primary)] p-5 shadow-[var(--lobb-shadow-card)] sm:p-7 md:min-h-[calc(100vh-40px)]">
        <PageHeaderSkeleton />
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <MetricGridSkeleton />
            <section className="rounded-[14px] bg-[var(--lobb-bg-secondary)] p-4 shadow-[var(--lobb-shadow-card)]">
              <TableRowsSkeleton />
            </section>
          </div>
          <section className="rounded-[14px] bg-[var(--lobb-bg-secondary)] p-4 shadow-[var(--lobb-shadow-card)]">
            <TableRowsSkeleton rows={4} />
          </section>
        </div>
      </div>
    </main>
  );
}
