import { PageHeaderSkeleton, SkeletonBlock, TableRowsSkeleton } from "@/components/common/lobb-skeleton";

export default function AdminBookingsLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 py-8 text-[var(--lobb-bg-inverse)]">
      <section className="mx-auto max-w-5xl">
        <PageHeaderSkeleton compact />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <section className="mt-6 rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-elevated)] p-4">
          <TableRowsSkeleton rows={5} />
        </section>
      </section>
    </main>
  );
}
