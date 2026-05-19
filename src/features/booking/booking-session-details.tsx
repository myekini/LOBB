export function BookingSessionDetails({ location, note }: { location: string; note?: string | null }) {
  return (
    <section className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
      <p className="font-black">{location}</p>
      {note && <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">&quot;{note}&quot;</p>}
    </section>
  );
}
