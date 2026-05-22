import { SkeletonBlock } from "@/components/common/lobb-skeleton";

export default function AdminBookingsLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 py-8 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-5xl">
        <SkeletonBlock className="h-8 w-44" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <section className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 rounded-[18px]" />
          ))}
        </section>
      </section>
    </main>
  );
}

