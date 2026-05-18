import { BookingCardSkeleton } from "@/components/lobb-skeleton";

export default function CoachBookingsLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <div className="h-7 w-36 rounded-full lobb-skeleton" />
        <div className="mt-6 h-14 rounded-[18px] lobb-skeleton" />
        <section className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <BookingCardSkeleton key={index} />
          ))}
        </section>
      </section>
    </main>
  );
}

