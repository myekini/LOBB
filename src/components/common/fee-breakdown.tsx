import { money } from "@/lib/dashboard-client-types";

// Canonical payment line-items for player-facing surfaces (confirm, booking
// detail, receipt). Keep the labels here — do not re-invent them per screen.
export type FeeBreakdownInput = {
  sessionFeeNgn?: number | null;
  convenienceFeeNgn?: number | null;
  /** Legacy fallback when convenience fee wasn't stored separately. */
  platformFeeNgn?: number | null;
  totalNgn: number;
};

export function feeBreakdownRows({ sessionFeeNgn, convenienceFeeNgn, platformFeeNgn }: FeeBreakdownInput) {
  return [
    { label: "Session fee", amount: sessionFeeNgn ?? 0 },
    { label: "Convenience fee", amount: convenienceFeeNgn ?? platformFeeNgn ?? 0 },
  ];
}

export function FeeBreakdown({ className, ...input }: FeeBreakdownInput & { className?: string }) {
  const rows = feeBreakdownRows(input);
  return (
    <div className={className}>
      <div className="space-y-3">
        {rows.map((row) => (
          <p key={row.label} className="flex items-center justify-between gap-5 text-sm font-medium text-[var(--lobb-text-secondary)]">
            <span>{row.label}</span>
            <span className="font-medium text-[var(--lobb-text-primary)]">{money(row.amount)}</span>
          </p>
        ))}
        <p className="flex items-center justify-between gap-5 border-t border-[var(--lobb-border-subtle)] pt-3 text-sm font-semibold text-[var(--lobb-text-primary)]">
          <span>Total paid</span>
          <span>{money(input.totalNgn)}</span>
        </p>
      </div>
    </div>
  );
}
