import Link from "next/link";
import { Gavel } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/features/admin/admin-shell";

export default function AdminDisputesPage() {
  return (
    <AdminShell active="Disputes">
      <AdminBackHeader title="Disputes" />

      <section className="mx-auto max-w-2xl rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center shadow-[0_14px_34px_rgba(13,13,13,0.04)]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]">
          <Gavel className="size-6" />
        </span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">Coming soon</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Dispute management is parked for MVP</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-[var(--lobb-muted)]">
          We will add the full resolution workflow after the core booking, coach approval, and payout loop is stable.
        </p>
        <Link href="/admin" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--lobb-black)] px-5 text-sm font-black text-white">
          Back to Dashboard
        </Link>
      </section>
    </AdminShell>
  );
}
