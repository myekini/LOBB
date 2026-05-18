import { CoachCardSkeleton } from "@/components/lobb-skeleton";

export default function CoachesLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <div className="mx-auto h-5 w-32 rounded-full lobb-skeleton" />
        <div className="mt-6 h-14 rounded-full lobb-skeleton" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-9 w-20 rounded-full lobb-skeleton" />
          ))}
        </div>
        <section className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <CoachCardSkeleton key={index} />
          ))}
        </section>
      </section>
    </main>
  );
}

