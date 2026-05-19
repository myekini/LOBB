export function DisputeCard({ dispute }: { dispute: { id: string; reason: string; status: string } }) {
  return <article className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4"><p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{dispute.id}</p><p className="mt-2 font-black capitalize">{dispute.status}</p><p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{dispute.reason}</p></article>;
}
