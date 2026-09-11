import { money } from "@/lib/dashboard-client-types";
import { Card } from "@/components/ui/card";

export function CoachEarningsSummary({ week, month, allTime }: { week: number; month: number; allTime: number }) {
  return (
    <Card as="section" variant="outlined" className="grid grid-cols-3 gap-0 py-0">
      <Stat label="Week" value={money(week)} />
      <Stat label="Month" value={money(month)} />
      <Stat label="All Time" value={money(allTime)} />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-[var(--lobb-border-subtle)] p-4 first:border-l-0"><p className="font-medium">{value}</p><p className="mt-1 text-[10px] font-medium uppercase text-[var(--lobb-text-secondary)]">{label}</p></div>;
}
