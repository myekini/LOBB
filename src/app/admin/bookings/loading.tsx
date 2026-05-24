import { PageHeaderSkeleton, SkeletonBlock, TableRowsSkeleton } from "@/components/common/lobb-skeleton";

export default function AdminBookingsLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 py-8 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-5xl">
        <PageHeaderSkeleton compact />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <section className="mt-6 rounded-[18px] bg-[var(--lobb-surface)] p-4">
          <TableRowsSkeleton rows={5} />
        </section>
      </section>
    </main>
  );
}
