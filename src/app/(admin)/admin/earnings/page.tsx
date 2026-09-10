"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  useAdminResource,
} from "@/features/admin/admin-shell";
import { retryStuckPayouts } from "@/features/admin/payout-actions";
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
      <AdminPageHeader eyebrow="Finance" title="Earnings" description="Booking revenue" backHref="/admin">
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

      <section className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-warning)]/12 text-[var(--lobb-warning)]">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Payout operations</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
                Retry completed sessions where the payout transfer to the coach has not been sent yet.
              </p>
            </div>
          </div>
        </div>
        <LobbButton variant="unstyled"
          type="button"
          disabled={retrying}
          onClick={retryPayouts}
          className="inline-flex h-full min-h-20 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)] disabled:opacity-60"
        >
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {retrying ? "Retrying payouts" : "Retry stuck payouts"}
        </LobbButton>
      </section>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold">Recent revenue</h2>
        <span className="text-xs font-medium text-[var(--lobb-text-secondary)]">{money(totalRecentFees)} fees shown</span>
      </div>
      <section className="mt-3 grid gap-3 xl:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-[var(--lobb-radius-lg)]" />)
        ) : data?.recent_revenue?.length ? (
          data.recent_revenue.map((booking) => (
            <article key={booking.id} className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-medium text-[var(--lobb-text-secondary)]">#{booking.id.slice(0, 8)}</p>
                  <p className="mt-1 text-sm font-medium">
                    {sessionParties(booking).player} <span className="font-normal text-[var(--lobb-text-tertiary)]">· coached by</span> {sessionParties(booking).coach}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{formatBookingDate(booking.starts_at)}</p>
                </div>
                <p className="font-medium">{money(booking.total_amount_ngn)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] px-3 py-2 text-xs font-medium">
                <span className="text-[var(--lobb-text-secondary)]">Platform fee</span>
                <span>{money(platformFee(booking))}</span>
              </div>
            </article>
          ))
        ) : (
          <AdminEmptyState
            title="No revenue yet"
            body="Paid bookings will appear here once sessions are confirmed or completed."
            className="xl:col-span-2"
          />
        )}
      </section>
    </AdminShell>
  );
}
