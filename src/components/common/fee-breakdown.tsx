import { money } from "@/lib/dashboard-client-types";

// Player-facing payment summary (booking detail, receipt). Per pricing spec
// v3.1 the player only ever sees the total charge — the session-fee / commission
// / convenience-fee split is disclosed in the Terms and Cancellation pages, not
// on payment surfaces. Props are kept for callers that still pass the
// individual amounts; only `totalNgn` is rendered.
export type FeeBreakdownInput = {
  sessionFeeNgn?: number | null;
  convenienceFeeNgn?: number | null;
  /** Legacy fallback when convenience fee wasn't stored separately. */
  platformFeeNgn?: number | null;
  totalNgn: number;
};

export function FeeBreakdown({ className, totalNgn }: FeeBreakdownInput & { className?: string }) {
  return (
    <div className={className}>
      <p className="flex items-center justify-between gap-5 text-sm font-semibold text-[var(--lobb-text-primary)]">
        <span>Total paid</span>
        <span>{money(totalNgn)}</span>
      </p>
    </div>
  );
}
