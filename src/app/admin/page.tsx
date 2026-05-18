"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Gavel, UserCheck } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { adminStats, money } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  return (
    <AdminShell active="Dashboard">
      <section>
        <h1 className="text-2xl font-black">Platform Overview</h1>

        <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <Stat value={String(adminStats.activeCoaches)} label="Active Coaches" />
          <Stat value={money(adminStats.totalGmv)} label="Total GMV" bordered />
          <Stat value={String(adminStats.totalBookings)} label="Total Bookings" top />
          <Stat value={String(adminStats.pendingApprovals)} label="Pending Approvals" bordered top clay />
        </div>

        <SectionTitle title="Action Items" />
        <div className="space-y-3">
          <ActionRow href="/admin/coaches" icon={<UserCheck className="size-5" />} title="3 coaches pending review" />
          <ActionRow href="/admin/disputes" icon={<Gavel className="size-5" />} title="1 dispute open" danger />
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
