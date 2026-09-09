import { money } from "@/lib/dashboard-client-types";
import { Card } from "@/components/ui/card";

export function MetricsOverview({ metrics }: { metrics: { total_bookings: number; gmv_ngn: number; active_coaches: number; active_players: number } }) {
  return <Card as="section" variant="outlined" className="grid grid-cols-2 gap-0 py-0"><Metric label="Bookings" value={String(metrics.total_bookings)} /><Metric label="GMV" value={money(metrics.gmv_ngn)} /><Metric label="Coaches" value={String(metrics.active_coaches)} /><Metric label="Players" value={String(metrics.active_players)} /></Card>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-t border-[var(--lobb-border-subtle)] p-4 first:border-l-0"><p className="text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{label}</p></div>;
}
