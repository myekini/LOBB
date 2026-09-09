"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, WalletCards } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { formatBookingDate, money, sessionParties } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
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
  const [data, setData] = useState<EarningsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      const res = await fetch("/api/admin/earnings");
      const payload = (await res.json()) as EarningsPayload & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Unable to load earnings");
      setData(payload);
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load earnings" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = data?.metrics;
  const platformFee = (booking: RevenueBooking) => booking.platform_commission_ngn + booking.convenience_fee_ngn;
  const totalRecentFees = data?.recent_revenue?.reduce((sum, booking) => sum + platformFee(booking), 0) ?? 0;

  const retryPayouts = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/payouts/retry-stuck", { method: "POST" });
      const json = await res.json() as { retried?: number; succeeded?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to retry payouts");
      showLobbToast(
        (json.retried ?? 0) === 0
          ? { type: "success", message: "No stuck payouts to retry" }
          : {
              type: json.failed ? "error" : "success",
              message: `${json.succeeded ?? 0} transferred, ${json.failed ?? 0} failed`,
            }
      );
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to retry payouts" });
    } finally {
      setRetrying(false);
      load("refresh");
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
            <WalletCards className="size-4" />
            Finance
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Earnings</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-[var(--lobb-text-secondary)]">Booking revenue</p>
          <LobbButton
            variant="unstyled"
            onClick={() => load("refresh")}
            disabled={loading || refreshing}
            aria-label="Refresh"
            className="inline-flex size-9 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </LobbButton>
        </div>
      </div>

      <section className="mt-6 border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] p-6 text-[var(--lobb-text-inverse)] sm:p-8">
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
            <Stat label="Total GMV" value={money(metrics?.gmv_ngn ?? 0)} />
            <Stat label="Bookings" value={String(metrics?.total_bookings ?? 0)} />
            <Stat label="Active coaches" value={String(metrics?.active_coaches ?? 0)} />
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
        <h2 className="font-semibold">Recent Revenue</h2>
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
          <div className="border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-8 text-center xl:col-span-2">
            <p className="text-lg font-medium">No revenue yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">Paid bookings will appear here once sessions are confirmed or completed.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--lobb-text-secondary)]">{label}</p>
    </div>
  );
}
