import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";

export default function CoachBookingsLoading() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Bookings" eyebrow="Coach schedule" active="bookings" actionHref="/coach/availability" actionLabel="Availability" />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <CoachSurface className="grid grid-cols-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={`p-4 ${index ? "border-l border-[var(--lobb-border-subtle)]" : ""}`}>
              <div className="h-5 w-12 rounded-full lobb-skeleton" />
              <div className="mt-2 h-3 w-16 rounded-full lobb-skeleton" />
            </div>
          ))}
        </CoachSurface>
        <div className="mt-6 h-14 rounded-[18px] lobb-skeleton" />
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <BookingCardSkeleton key={index} />
          ))}
        </section>
      </section>
    </main>
  );
}
