"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Landmark, WalletCards, XCircle } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { showLobbToast } from "@/components/lobb-global-state";
import { SkeletonBlock } from "@/components/lobb-skeleton";
import { money } from "@/lib/dashboard-client-types";
import { CoachFlowHeader } from "@/components/coach-flow-header";

type Payout = {
  id: string;
  amount_ngn: number;
  session_count: number;
  status: "pending" | "processed" | "failed";
  processed_at: string | null;
  created_at: string;
};

type EarningsPayload = {
  summary: {
    net_this_week_ngn: number;
    net_this_month_ngn: number;
    net_all_time_ngn: number;
    pending_payout_ngn: number;
  };
  payouts: Payout[];
  bank: {
    bank_name: string | null;
    bank_account_number: string | null;
    bank_code: string | null;
    paystack_subaccount_code: string | null;
  } | null;
};

function payoutDate(payout: Payout) {
  const value = payout.processed_at ?? payout.created_at;
  return new Date(value).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

function maskedAccount(account: string | null | undefined) {
  if (!account) return "No account added";
  return `**** ${account.slice(-4)}`;
}

const statusMeta = {
  processed: { label: "Settled", icon: CheckCircle2, color: "var(--lobb-success)" },
  pending: { label: "Pending", icon: Clock3, color: "var(--lobb-clay)" },
  failed: { label: "Failed", icon: XCircle, color: "#ba1a1a" },
};

export default function CoachEarningsPage() {
  const [payload, setPayload] = useState<EarningsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/coach/earnings", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as EarningsPayload | { error?: string };
        if (!res.ok) throw new Error("error" in json ? json.error : "Unable to load earnings");
        if (alive) setPayload(json as EarningsPayload);
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

  const summary = payload?.summary;
  const bank = payload?.bank;
  const hasBank = Boolean(bank?.bank_name && bank?.bank_account_number);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Earnings" eyebrow="Coach wallet" actionHref="/coach/settings" actionLabel="Bank" actionIcon={Landmark} />
      <section className="mx-auto max-w-md pt-5">
        <section className="mt-6 rounded-[24px] bg-[var(--lobb-black)] p-6 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Total Paid + Pending</p>
          {loading ? <SkeletonBlock className="mx-auto mt-8 h-10 w-44 bg-white/15" /> : (
            <p className="mt-8 text-center text-[32px] font-black leading-none">{money(summary?.net_all_time_ngn ?? 0)}</p>
          )}
          <p className="mt-8 text-sm font-semibold text-white/50">Net coach earnings from completed sessions</p>
        </section>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <StatCell value={loading ? null : money(summary?.net_this_week_ngn ?? 0)} label="This Week" />
          <StatCell value={loading ? null : money(summary?.pending_payout_ngn ?? 0)} label="Pending Payout" bordered />
        </div>

        <h2 className="mt-8 text-base font-black">Recent Payouts</h2>
        <section className="mt-3 space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="mt-3 h-12 w-full" />
              </article>
            ))
          ) : payload?.payouts.length ? (
            payload.payouts.map((payout) => {
              const meta = statusMeta[payout.status] ?? statusMeta.pending;
              const Icon = meta.icon;
              return (
                <article key={payout.id} className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-[var(--lobb-surface-2)]">
                        <WalletCards className="size-4 text-[var(--lobb-clay)]" />
                      </div>
                      <div>
                        <p className="text-sm font-black">{payoutDate(payout)}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">
                          {payout.session_count} {payout.session_count === 1 ? "session" : "sessions"}
                        </p>
                        <p className="mt-2 text-sm font-black">{money(payout.amount_ngn)} <span className="text-[var(--lobb-muted)]">to your bank</span></p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lobb-surface-2)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">
                      <Icon className="size-3" style={{ color: meta.color }} />
                      {meta.label}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold text-[var(--lobb-muted)]">
              No payouts yet. Completed sessions ready for payout will appear here.
            </p>
          )}
        </section>

        <h2 className="mt-8 text-base font-black">Bank account</h2>
        <Link href="/coach/settings" className="mt-3 flex items-center justify-between rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-white">
              <Landmark className="size-5 text-[var(--lobb-clay)]" />
            </div>
            <div>
              <p className="font-black">{hasBank ? bank?.bank_name : "No bank account connected"}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{maskedAccount(bank?.bank_account_number)}</p>
            </div>
          </div>
          <span className="text-xs font-black text-[var(--lobb-clay)]">Manage</span>
        </Link>
      </section>

      <CoachBottomNav active="earnings" />
    </main>
  );
}

function StatCell({ value, label, bordered }: { value: string | null; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border)]" : ""}`}>
      {value ? <p className="text-lg font-black">{value}</p> : <SkeletonBlock className="h-6 w-24" />}
      <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
