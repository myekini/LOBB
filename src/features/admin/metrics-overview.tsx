import { money } from "@/lib/dashboard-client-types";

export function MetricsOverview({ metrics }: { metrics: { total_bookings: number; gmv_ngn: number; active_coaches: number; active_players: number } }) {
  return <section className="grid grid-cols-2 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]"><Metric label="Bookings" value={String(metrics.total_bookings)} /><Metric label="GMV" value={money(metrics.gmv_ngn)} /><Metric label="Coaches" value={String(metrics.active_coaches)} /><Metric label="Players" value={String(metrics.active_players)} /></section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-t border-[var(--lobb-border)] p-4 first:border-l-0"><p className="text-xl font-black">{value}</p><p className="mt-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">{label}</p></div>;
}
