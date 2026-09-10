"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
  coaches: { full_name: string } | { full_name: string }[] | null;
  players: { full_name: string } | { full_name: string }[] | null;
};

type EarningsPayload = {
  metrics: Metrics | null;
  recent_revenue: RevenueBooking[];
};

export default function AdminEarningsPage() {
  const { data, loading, refreshing, reload } = useAdminResource<EarningsPayload>("/api/admin/earnings");
  const [retrying, setRetrying] = useState(false);

  const metrics = data?.metrics;
  const platformFee = (booking: RevenueBooking) => booking.platform_commission_ngn + booking.convenience_fee_ngn;
  const totalRecentFees = data?.recent_revenue?.reduce((sum, booking) => sum + platformFee(booking), 0) ?? 0;

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
      <AdminPageHeader eyebrow="Finance" title="Earnings" description="Booking revenue and payout health" backHref="/admin">
        <LobbButton
          variant="unstyled"
          type="button"
          disabled={retrying}
          onClick={retryPayouts}
          className="inline-flex h-11 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-sm font-medium disabled:opacity-60"
        >
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {retrying ? "Retrying" : "Retry stuck payouts"}
        </LobbButton>
        <AdminRefreshButton onClick={() => reload("refresh")} busy={loading || refreshing} />
      </AdminPageHeader>

      <section className="border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] p-6 text-[var(--lobb-text-inverse)] sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/75">LOBB earnings</p>
        {loading ? (
          <SkeletonBlock className="mt-5 h-12 w-52 bg-white/15" />
        ) : (
          <p className="mt-5 text-[38px] font-semibold leading-none sm:text-[54px]">{money(metrics?.lobb_earnings_ngn ?? 0)}</p>
        )}
        <p className="mt-3 text-sm font-medium text-white/75">Completed booking commission and convenience fees.</p>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-[var(--lobb-radius-lg)]" />)
        ) : (
          <>
            <AdminMetricCard label="Total GMV" value={money(metrics?.gmv_ngn ?? 0)} />
            <AdminMetricCard label="Bookings" value={String(metrics?.total_bookings ?? 0)} />
            <AdminMetricCard label="Active coaches" value={String(metrics?.active_coaches ?? 0)} />
          </>
        )}
      </div>

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Platform fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_revenue.map((booking) => {
                const { coach, player } = sessionParties(booking);
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-[var(--lobb-text-secondary)]">
                      #{booking.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {player} <span className="font-normal text-[var(--lobb-text-tertiary)]">· coached by</span> {coach}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {formatBookingDate(booking.starts_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">{money(booking.total_amount_ngn)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium text-[var(--lobb-clay)]">
                      {money(platformFee(booking))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState
            title="No revenue yet"
            body="Paid bookings will appear here once sessions are confirmed or completed."
          />
        )}
      </section>
    </AdminShell>
  );
}
