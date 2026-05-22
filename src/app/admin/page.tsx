"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Gavel, UserCheck } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { money } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";

type AdminDashboardPayload = {
  metrics: {
    total_bookings: number;
    gmv_ngn: number;
    active_coaches: number;
    active_players: number;
    lobb_earnings_ngn: number;
    pending_coach_approvals: number;
    open_disputes: number;
  } | null;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWithCache<AdminDashboardPayload>("lobb.admin.dashboard", "/api/admin/dashboard")
      .then((payload) => {
        if (alive) setData(payload);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load admin dashboard" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const metrics = data?.metrics;

  return (
    <AdminShell active="Dashboard">
      <section>
        <h1 className="text-2xl font-black">Platform Overview</h1>

        {loading ? (
          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="border-l border-t border-[var(--lobb-border)] p-5 first:border-l-0">
                <SkeletonBlock className="h-7 w-20" />
                <SkeletonBlock className="mt-3 h-3 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
            <Stat value={String(metrics?.active_coaches ?? 0)} label="Active Coaches" />
            <Stat value={money(metrics?.gmv_ngn ?? 0)} label="Total GMV" bordered />
            <Stat value={String(metrics?.total_bookings ?? 0)} label="Total Bookings" top />
            <Stat value={String(metrics?.pending_coach_approvals ?? 0)} label="Pending Approvals" bordered top clay />
            <Stat value={String(metrics?.active_players ?? 0)} label="Active Players" top />
            <Stat value={money(metrics?.lobb_earnings_ngn ?? 0)} label="LOBB Earnings" bordered top />
          </div>
        )}

        <SectionTitle title="Action Items" />
        <div className="space-y-3">
          <ActionRow href="/admin/coaches" icon={<UserCheck className="size-5" />} title={`${metrics?.pending_coach_approvals ?? 0} coaches pending review`} />
          <ActionRow href="/admin/disputes" icon={<Gavel className="size-5" />} title={`${metrics?.open_disputes ?? 0} disputes open`} danger />
        </div>

        <SectionTitle title="Navigation" />
        <div className="overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]">
          <NavRow href="/admin/coaches" label="Coach Approvals" />
          <NavRow href="/admin/bookings" label="All Bookings" />
          <NavRow href="/admin/disputes" label="Disputes" />
          <NavRow href="/admin/earnings" label="Platform Earnings" />
        </div>
      </section>
    </AdminShell>
  );
}

function Stat({ value, label, bordered, top, clay }: { value: string; label: string; bordered?: boolean; top?: boolean; clay?: boolean }) {
  return (
    <div className={`p-5 ${bordered ? "border-l border-[var(--lobb-border)]" : ""} ${top ? "border-t border-[var(--lobb-border)]" : ""}`}>
      <p className={`text-2xl font-black ${clay ? "text-[var(--lobb-clay)]" : ""}`}>{value}</p>
      <p className="mt-2 text-xs font-black uppercase leading-4 tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">{title}</span>
      <span className="h-px flex-1 bg-[var(--lobb-border)]" />
    </div>
  );
}

function ActionRow({ href, icon, title, danger }: { href: string; icon: React.ReactNode; title: string; danger?: boolean }) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 font-black shadow-[0_10px_22px_rgba(13,13,13,0.04)] ${danger ? "text-red-700" : "text-[var(--lobb-clay)]"}`}>
      <span className="flex items-center gap-3">{danger ? <AlertTriangle className="size-5" /> : icon}{title}</span>
      <ChevronRight className="size-5" />
    </Link>
  );
}

function NavRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between border-b border-[var(--lobb-border)] px-4 py-4 text-sm font-black last:border-b-0">
      {label}
      <ChevronRight className="size-4 text-[var(--lobb-muted)]" />
    </Link>
  );
}
