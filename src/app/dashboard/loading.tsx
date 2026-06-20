import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";

export default function DashboardLoading() {
  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader active="bookings" title="My bookings" eyebrow="Player dashboard" />
      <section className="mx-auto max-w-5xl px-4 pt-7 sm:px-6 lg:pt-10">
        <div className="h-7 w-36 rounded-full lobb-skeleton" />
        <div className="mt-6 h-14 rounded-[16px] lobb-skeleton" />
        <div className="my-7 h-px w-full bg-[var(--lobb-border)]" />
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <BookingCardSkeleton key={index} />
          ))}
        </section>
      </section>
      <PlayerBottomNav active="bookings" />
    </main>
  );
}
