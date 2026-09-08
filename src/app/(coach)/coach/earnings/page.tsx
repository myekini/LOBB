"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, Gift, Landmark, WalletCards, XCircle } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { money } from "@/lib/dashboard-client-types";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";

type Payout = {
  id: string;
  amount_ngn: number;
  session_count: number;
  status: "pending" | "processed" | "failed";
  processed_at: string | null;
  created_at: string;
};

type ReferralCredit = {
  id: string;
  amount: number;
  status: "pending" | "released" | "paid_out";
  released_at: string | null;
  created_at: string;
};

type EarningsPayload = {
  summary: {
    net_this_week_ngn: number;
    net_this_month_ngn: number;
    net_all_time_ngn: number;
    pending_payout_ngn: number;
  };
  referral: {
    referral_code: string | null;
    signups_count: number;
    booked_count: number;
    total_ngn: number;
    released_ngn: number;
    paid_out_ngn: number;
    credits: ReferralCredit[];
  };
  payouts: Payout[];
  bank: {
    bank_name: string | null;
    bank_account_number: string | null;
    bank_code: string | null;
    paystack_recipient_code: string | null;
    dva_account_number: string | null;
    dva_bank_name: string | null;
  } | null;
};

function payoutDate(payout: Payout) {
  const value = payout.processed_at ?? payout.created_at;
  return new Date(value).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

function creditDate(credit: ReferralCredit) {
  return new Date(credit.created_at).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

function maskedAccount(account: string | null | undefined) {
  if (!account) return "No account added";
  return `**** ${account.slice(-4)}`;
}

const payoutStatusMeta = {
  processed: { label: "Settled", icon: CheckCircle2, color: "var(--lobb-success)" },
  pending: { label: "Pending", icon: Clock3, color: "var(--lobb-clay)" },
  failed: { label: "Failed", icon: XCircle, color: "var(--lobb-error)" },
};

const creditStatusMeta = {
  released: { label: "Available", icon: CheckCircle2, color: "var(--lobb-success)" },
  pending: { label: "Pending", icon: Clock3, color: "var(--lobb-clay)" },
  paid_out: { label: "Paid out", icon: CheckCircle2, color: "var(--lobb-text-tertiary)" },
};

const PAYOUT_THRESHOLD = 5000;

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

    return () => { alive = false; };
  }, []);

  const summary = payload?.summary;
  const referral = payload?.referral;
  const bank = payload?.bank;
  const hasBank = Boolean(bank?.bank_name && bank?.bank_account_number);

  const sessionEarnings = summary?.net_all_time_ngn ?? 0;
  const referralEarnings = referral?.total_ngn ?? 0;
  const totalEarnings = sessionEarnings + referralEarnings;
  const availableReferral = (referral?.released_ngn ?? 0) - (referral?.paid_out_ngn ?? 0);
  const canWithdrawReferral = availableReferral >= PAYOUT_THRESHOLD;

  return (
    <main className="lobb-app-page min-h-screen px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Earnings" eyebrow="Coach wallet" active="earnings" />

      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">

        {/* ── Top summary card ────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
          <section className="overflow-hidden bg-[#0D0D0D] p-5 text-white sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">Total earnings</p>
            {loading ? (
              <SkeletonBlock className="mt-6 h-10 w-44 bg-white/15" />
            ) : (
              <p className="mt-6 text-[38px] font-black leading-none sm:text-[48px]">{money(totalEarnings)}</p>
            )}
            <p className="mt-3 text-sm font-semibold text-white/75">Sessions and referral bonuses combined.</p>

            {/* 3-column breakdown */}
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/10">
              <WalletStat value={loading ? null : money(sessionEarnings)} label="Sessions" />
              <WalletStat value={loading ? null : money(referralEarnings)} label="Referrals" bordered />
              <WalletStat value={loading ? null : money(summary?.pending_payout_ngn ?? 0)} label="Pending" bordered />
            </div>
          </section>

          <Link href="/coach/settings/bank" className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 transition-colors hover:border-[var(--lobb-clay)]/35">
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-12 items-center justify-center rounded-[16px] bg-[var(--lobb-clay-light)]">
                <Landmark className="size-5 text-[var(--lobb-clay)]" />
              </div>
              <ArrowRight className="size-4 text-[var(--lobb-text-tertiary)]" />
            </div>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Bank account</p>
            <p className="mt-2 text-lg font-black">{hasBank ? bank?.bank_name : "No bank connected"}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--lobb-text-secondary)]">{maskedAccount(bank?.bank_account_number)}</p>
            <p className="mt-5 inline-flex h-10 items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-black text-[var(--lobb-text-inverse)]">
              {hasBank ? "Manage payout bank" : "Add payout bank"}
            </p>
          </Link>
        </div>

        {/* ── Session payouts ─────────────────────────────────────────────── */}
        <div className="mt-7 flex items-center justify-between">
          <div>
            <h2 className="font-black">Session payouts</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">Settlements sent or queued for your bank account.</p>
          </div>
        </div>

        <section className="mt-3 grid gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <article key={i} className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="mt-3 h-10 w-full" />
              </article>
            ))
          ) : payload?.payouts.length ? (
            payload.payouts.map((payout) => {
              const meta = payoutStatusMeta[payout.status] ?? payoutStatusMeta.pending;
              const Icon = meta.icon;
              return (
                <article key={payout.id} className="lobb-app-card grid gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:grid-cols-[minmax(0,1fr)_140px_120px] sm:items-center">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-bg-secondary)]">
                      <WalletCards className="size-4 text-[var(--lobb-clay)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black">{payoutDate(payout)}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">
                        {payout.session_count} {payout.session_count === 1 ? "session" : "sessions"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-black sm:text-right">{money(payout.amount_ngn)}</p>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--lobb-bg-secondary)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--lobb-text-secondary)] sm:justify-self-end">
                    <Icon className="size-3" style={{ color: meta.color }} />
                    {meta.label}
                  </span>
                </article>
              );
            })
          ) : (
            <CoachSurface className="p-5">
              <p className="text-sm font-black text-[var(--lobb-text-primary)]">No payouts yet</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
                Completed sessions ready for payout will appear here.
              </p>
              {!hasBank && (
                <Link href="/coach/settings/bank" className="mt-4 inline-flex h-10 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-black text-[var(--lobb-text-inverse)]">
                  Add payout bank
                </Link>
              )}
            </CoachSurface>
          )}
        </section>

        {/* ── Referral earnings ───────────────────────────────────────────── */}
        <div className="mt-9 flex items-center justify-between">
          <div>
            <h2 className="font-black">Referral earnings</h2>
            <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">
              ₦1,500 per new player you bring to LOBB who completes their first session.
            </p>
          </div>
        </div>

        {!loading && referral && (
          <div className="mt-3 grid grid-cols-3 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
            <ReferralStat value={String(referral.signups_count)} label="Sign-ups" />
            <ReferralStat value={String(referral.booked_count)} label="Booked" bordered />
            <ReferralStat value={money(referral.total_ngn)} label="Earned" bordered />
          </div>
        )}

        {loading && <SkeletonBlock className="mt-3 h-20 w-full" />}

        {/* Withdrawal notice */}
        {!loading && referralEarnings > 0 && (
          <p className="mt-3 text-xs font-semibold text-[var(--lobb-text-secondary)]">
            {canWithdrawReferral
              ? `₦${availableReferral.toLocaleString()} available — LOBB will include this in your next payout.`
              : `Referral balance: ${money(availableReferral)} · Withdrawable once you reach ${money(PAYOUT_THRESHOLD)}.`}
          </p>
        )}

        <section className="mt-3 grid gap-3">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <article key={i} className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="mt-3 h-8 w-full" />
              </article>
            ))
          ) : referral?.credits.length ? (
            referral.credits.map((credit) => {
              const meta = creditStatusMeta[credit.status] ?? creditStatusMeta.pending;
              const Icon = meta.icon;
              return (
                <article key={credit.id} className="lobb-app-card grid gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:grid-cols-[minmax(0,1fr)_140px_120px] sm:items-center">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-clay-light)]">
                      <Gift className="size-4 text-[var(--lobb-clay)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black">Referral bonus</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">{creditDate(credit)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black sm:text-right">{money(credit.amount)}</p>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--lobb-bg-secondary)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--lobb-text-secondary)] sm:justify-self-end">
                    <Icon className="size-3" style={{ color: meta.color }} />
                    {meta.label}
                  </span>
                </article>
              );
            })
          ) : (
            <CoachSurface className="p-5">
              <p className="text-sm font-black text-[var(--lobb-text-primary)]">No referral earnings yet</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
                Share your referral link from the dashboard. You earn ₦1,500 each time a referred player completes their first session.
              </p>
            </CoachSurface>
          )}
        </section>
      </section>

      <CoachBottomNav active="earnings" />
    </main>
  );
}

function WalletStat({ value, label, bordered }: { value: string | null; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-white/10" : ""}`}>
      {value ? <p className="truncate text-lg font-black text-white">{value}</p> : <SkeletonBlock className="h-6 w-24 bg-white/15" />}
      <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-white/75">{label}</p>
    </div>
  );
}

function ReferralStat({ value, label, bordered }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border-subtle)]" : ""}`}>
      <p className="truncate text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[var(--lobb-text-tertiary)]">{label}</p>
    </div>
  );
}
