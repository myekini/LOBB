"use client";

import Link from "next/link";
import { CheckCircle2, Landmark, WalletCards } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { money } from "@/lib/mock-data";

const payouts = [
  { date: "Mon 6 May", sessions: "3 sessions", amount: 51000 },
  { date: "Wed 1 May", sessions: "5 sessions", amount: 85000 },
  { date: "Mon 22 Apr", sessions: "2 sessions", amount: 34000 },
];

export default function CoachEarningsPage() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">Earnings</h1>

        <section className="mt-6 rounded-[24px] bg-[var(--lobb-black)] p-6 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Total Earned (All Time)</p>
          <p className="mt-8 text-center text-[32px] font-black leading-none">{money(180000)}</p>
          <p className="mt-8 text-sm font-semibold text-white/50">{money(18000)} LOBB commission</p>
        </section>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <StatCell value={money(60000)} label="This Week" />
          <StatCell value={money(12000)} label="Pending" bordered />
        </div>

        <h2 className="mt-8 text-base font-black">Recent Payouts</h2>
        <section className="mt-3 space-y-3">
          {payouts.map((payout) => (
            <article key={payout.date} className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--lobb-surface-2)]">
                    <WalletCards className="size-4 text-[var(--lobb-clay)]" />
                  </div>
                  <div>
                    <p className="text-sm font-black">{payout.date}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">{payout.sessions}</p>
                    <p className="mt-2 text-sm font-black">{money(payout.amount)} <span className="text-[var(--lobb-muted)]">→ Your bank</span></p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--lobb-surface-2)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--lobb-muted)]">
                  <CheckCircle2 className="size-3 text-[var(--lobb-success)]" />
                  Settled
                </span>
              </div>
            </article>
          ))}
        </section>

        <h2 className="mt-8 text-base font-black">Bank account</h2>
        <Link href="/coach/profile" className="mt-3 flex items-center justify-between rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-white">
              <Landmark className="size-5 text-[var(--lobb-clay)]" />
            </div>
            <div>
              <p className="font-black">GTBank</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">**** 4521</p>
            </div>
          </div>
          <span className="text-xs font-black text-[var(--lobb-clay)]">Edit</span>
        </Link>
      </section>

      <CoachBottomNav active="earnings" />
    </main>
  );
}

function StatCell({ value, label, bordered }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div className={`p-4 ${bordered ? "border-l border-[var(--lobb-border)]" : ""}`}>
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
