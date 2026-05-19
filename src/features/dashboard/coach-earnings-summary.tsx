import { money } from "@/lib/dashboard-client-types";

export function CoachEarningsSummary({ week, month, allTime }: { week: number; month: number; allTime: number }) {
  return (
    <section className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]">
      <Stat label="Week" value={money(week)} />
      <Stat label="Month" value={money(month)} />
      <Stat label="All Time" value={money(allTime)} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-[var(--lobb-border)] p-4 first:border-l-0"><p className="font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">{label}</p></div>;
}
