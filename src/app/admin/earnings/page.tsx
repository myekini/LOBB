"use client";

import { AdminShell } from "@/features/admin/admin-shell";
import { adminBookings, adminStats, money } from "@/lib/demo-content";

export default function AdminEarningsPage() {
  const commission = Math.round(adminStats.totalGmv * 0.05);

  return (
    <AdminShell active="Platform Earnings">
      <h1 className="text-2xl font-black">Platform Earnings</h1>
      <section className="mt-6 rounded-[24px] bg-[var(--lobb-black)] p-6 text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Total GMV</p>
        <p className="mt-5 text-[32px] font-black">{money(adminStats.totalGmv)}</p>
        <p className="mt-3 text-sm font-semibold text-white/55">{money(commission)} estimated platform fee</p>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Bookings" value={String(adminStats.totalBookings)} />
        <Stat label="Active Coaches" value={String(adminStats.activeCoaches)} />
        <Stat label="Pending Approvals" value={String(adminStats.pendingApprovals)} />
      </div>
      <h2 className="mt-8 font-black">Recent Revenue</h2>
      <section className="mt-3 space-y-3">
        {adminBookings.slice(0, 4).map((booking) => (
          <article key={booking.id} className="flex items-center justify-between rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <div>
              <p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id}</p>
              <p className="mt-1 text-sm font-black">{booking.coach} ← {booking.player}</p>
            </div>
            <p className="font-black">{money(booking.amount)}</p>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
