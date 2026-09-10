"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, WalletCards } from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  useAdminResource,
} from "@/features/admin/admin-shell";
import { retryStuckPayouts } from "@/features/admin/payout-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBookingDate, money, sessionParties } from "@/lib/dashboard-client-types";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";

type Metrics = {
  total_bookings: number;
  gmv_ngn: number;
  active_coaches: number;
  pending_coach_approvals: number;
  lobb_earnings_ngn: number;
};

type RevenueBooking = {
  id: string;
  starts_at: string;
  status: string;
  total_amount_ngn: number;
  platform_commission_ngn: number;
  convenience_fee_ngn: number;
  coach_payout_ngn: number;
  paystack_transfer_code: string | null;
  escrow_released_at: string | null;
  coaches: { full_name: string } | { full_name: string }[] | null;
  players: { full_name: string } | { full_name: string }[] | null;
};

type EarningsPayload = {
  metrics: Metrics | null;
  recent_revenue: RevenueBooking[];
  payout_attention: { count: number; amount_ngn: number };
};

export default function AdminEarningsPage() {
  const { data, loading, refreshing, reload } = useAdminResource<EarningsPayload>("/api/admin/earnings");
  const [retrying, setRetrying] = useState(false);

  const metrics = data?.metrics;
  const platformFee = (booking: RevenueBooking) => booking.platform_commission_ngn + booking.convenience_fee_ngn;
  const totalRecentFees = data?.recent_revenue?.reduce((sum, booking) => sum + platformFee(booking), 0) ?? 0;
  const totalCoachPayouts = data?.recent_revenue?.reduce((sum, booking) => sum + booking.coach_payout_ngn, 0) ?? 0;
  const payoutAttention = data?.payout_attention ?? { count: 0, amount_ngn: 0 };

  const retryPayouts = async () => {
    setRetrying(true);
    try {
      await retryStuckPayouts();
    } finally {
      setRetrying(false);
      reload("refresh");
    }
  };

  return (
    <AdminShell>
      <AdminPageHeader eyebrow="Finance" title="Earnings" description="Revenue, coach payouts and exceptions" backHref="/admin">
        <AdminRefreshButton onClick={() => reload("refresh")} busy={loading || refreshing} />
      </AdminPageHeader>

      <section className="border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] p-6 text-[var(--lobb-text-inverse)] sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-inverse-muted)]">LOBB platform revenue</p>
        {loading ? (
          <SkeletonBlock className="mt-5 h-12 w-52 bg-[var(--lobb-border-inverse)]" />
        ) : (
          <p className="mt-5 text-[38px] font-semibold leading-none text-[var(--lobb-text-inverse)] sm:text-[54px]">{money(metrics?.lobb_earnings_ngn ?? 0)}</p>
        )}
        <p className="mt-3 text-sm font-medium text-[var(--lobb-text-inverse-muted)]">Commission and convenience fees from completed sessions.</p>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-[var(--lobb-radius-lg)]" />)
        ) : (
          <>
            <AdminMetricCard label="Gross booking value" value={money(metrics?.gmv_ngn ?? 0)} />
            <AdminMetricCard label="Coach payouts shown" value={money(totalCoachPayouts)} />
            <AdminMetricCard label="Total bookings" value={String(metrics?.total_bookings ?? 0)} />
          </>
        )}
      </div>

      {!loading && payoutAttention.count > 0 && (
        <section className="mt-5 flex flex-col gap-4 border border-[var(--lobb-warning)]/40 bg-[var(--lobb-warning)]/10 p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-warning)]/15 text-[var(--lobb-text-primary)]"><AlertTriangle className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{payoutAttention.count} coach payout{payoutAttention.count === 1 ? "" : "s"} need attention</p>
            <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{money(payoutAttention.amount_ngn)} is ready to transfer.</p>
          </div>
          <LobbButton variant="dark" disabled={retrying} onClick={retryPayouts}>
            {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {retrying ? "Retrying payouts…" : "Retry payouts"}
          </LobbButton>
        </section>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold">Recent revenue</h2>
        <span className="text-xs font-medium text-[var(--lobb-text-secondary)]">{money(totalRecentFees)} fees shown</span>
      </div>
      <section className="mt-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-14 rounded-[var(--lobb-radius-md)]" />
            ))}
          </div>
        ) : data?.recent_revenue?.length ? (
          <>
          <div className="space-y-3 md:hidden">
            {data.recent_revenue.map((booking) => {
              const { coach, player } = sessionParties(booking);
              return (
                <article key={booking.id} className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
                  <p className="truncate text-sm font-semibold">{player}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--lobb-text-secondary)]">coached by {coach}</p>
                  <p className="mt-2 text-xs text-[var(--lobb-text-tertiary)]">{formatBookingDate(booking.starts_at)} · #{booking.id.slice(0, 8)}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--lobb-border-subtle)] pt-3 text-xs">
                    <div><p className="text-[var(--lobb-text-tertiary)]">Gross</p><p className="mt-1 font-semibold">{money(booking.total_amount_ngn)}</p></div>
                    <div><p className="text-[var(--lobb-text-tertiary)]">Coach</p><p className="mt-1 font-semibold">{money(booking.coach_payout_ngn)}</p></div>
                    <div className="text-right"><p className="text-[var(--lobb-text-tertiary)]">LOBB</p><p className="mt-1 font-semibold text-[var(--lobb-clay)]">{money(platformFee(booking))}</p></div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Coach payout</TableHead>
                <TableHead className="text-right">LOBB revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_revenue.map((booking) => {
                const { coach, player } = sessionParties(booking);
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="text-sm font-medium">
                      {player} <span className="font-normal text-[var(--lobb-text-tertiary)]">· coached by</span> {coach}
                      <span className="mt-1 block font-mono text-[10px] text-[var(--lobb-text-tertiary)]">#{booking.id.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {formatBookingDate(booking.starts_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">{money(booking.total_amount_ngn)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">{money(booking.coach_payout_ngn)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium text-[var(--lobb-clay)]">
                      {money(platformFee(booking))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          </>
        ) : (
          <AdminEmptyState icon={WalletCards}
            title="No revenue yet"
            body="Paid bookings will appear here once sessions are confirmed or completed."
          />
        )}
      </section>
    </AdminShell>
  );
}
