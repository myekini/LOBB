import { CoachCardSkeleton } from "@/components/common/lobb-skeleton";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";

export default function CoachesLoading() {
  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader active="coaches" title="Coaches" eyebrow="Browse" />
      <section className="mx-auto max-w-6xl px-5 pt-7">
        <div className="h-5 w-32 rounded-full lobb-skeleton" />
        <div className="mt-6 h-14 rounded-full lobb-skeleton" />
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-9 w-20 rounded-full lobb-skeleton" />
          ))}
        </div>
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <CoachCardSkeleton key={index} />
          ))}
        </section>
      </section>
      <PlayerBottomNav active="coaches" />
    </main>
  );
}
