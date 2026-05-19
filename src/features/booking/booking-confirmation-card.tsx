export function BookingConfirmationCard({ title, body }: { title: string; body: string }) {
  return <section className="rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5"><h2 className="font-black">{title}</h2><p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">{body}</p></section>;
}
