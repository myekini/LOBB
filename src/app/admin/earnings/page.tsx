"use client";

import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { firstJoin, formatBookingDate, money } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
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

  useEffect(() => {
    let alive = true;
    fetchWithCache<EarningsPayload>("lobb.admin.earnings", "/api/admin/earnings")
      .then((payload) => {
        if (alive) setData(payload);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load earnings" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const metrics = data?.metrics;
  const platformFee = (booking: RevenueBooking) => booking.platform_commission_ngn + booking.convenience_fee_ngn;

  return (
    <AdminShell active="Platform Earnings">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
            <WalletCards className="size-4" />
            Finance
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Earnings</h1>
        </div>
        <p className="text-sm font-black text-[var(--lobb-muted)]">Real booking revenue</p>
      </div>

      <section className="mt-6 rounded-[24px] bg-[var(--lobb-black)] p-6 text-white shadow-[0_18px_40px_rgba(13,13,13,0.18)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">LOBB earnings</p>
        {loading ? (
          <SkeletonBlock className="mt-5 h-12 w-52 bg-white/15" />
        ) : (
          <p className="mt-5 text-[38px] font-black leading-none sm:text-[54px]">{money(metrics?.lobb_earnings_ngn ?? 0)}</p>
        )}
        <p className="mt-3 text-sm font-semibold text-white/55">Completed booking commission and convenience fees.</p>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-[18px]" />)
        ) : (
          <>
            <Stat label="Total GMV" value={money(metrics?.gmv_ngn ?? 0)} />
            <Stat label="Bookings" value={String(metrics?.total_bookings ?? 0)} />
            <Stat label="Active Coaches" value={String(metrics?.active_coaches ?? 0)} />
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-black">Recent Revenue</h2>
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">{data?.recent_revenue?.length ?? 0} records</span>
      </div>
      <section className="mt-3 grid gap-3 xl:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-24 rounded-[18px]" />)
        ) : data?.recent_revenue?.length ? (
          data.recent_revenue.map((booking) => (
            <article key={booking.id} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.03)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id.slice(0, 8)}</p>
                  <p className="mt-1 text-sm font-black">
                    {firstJoin(booking.coaches)?.full_name ?? "Coach"} {"->"} {firstJoin(booking.players)?.full_name ?? "Player"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">{formatBookingDate(booking.starts_at)}</p>
                </div>
                <p className="font-black">{money(booking.total_amount_ngn)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-[14px] bg-[var(--lobb-bg)] px-3 py-2 text-xs font-black">
                <span className="uppercase tracking-[0.12em] text-[var(--lobb-muted)]">Platform fee</span>
                <span>{money(platformFee(booking))}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[22px] border border-dashed border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center xl:col-span-2">
            <p className="text-lg font-black">No revenue yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--lobb-muted)]">Paid bookings will appear here once sessions are confirmed or completed.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.03)]">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
