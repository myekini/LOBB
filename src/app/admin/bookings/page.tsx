"use client";

import { useEffect, useState } from "react";
import { Circle, Gavel, Loader2, Send } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";

type Filter = "all" | "pending" | "confirmed" | "completed" | "disputed" | "cancelled";

const filters: Filter[] = ["all", "pending", "confirmed", "completed", "disputed", "cancelled"];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutBusyId, setPayoutBusyId] = useState<string | null>(null);
  const [disputeBusyId, setDisputeBusyId] = useState<string | null>(null);

  const openDispute = async (booking: DashboardBooking) => {
    const reason = window.prompt(
      `Open a dispute on booking #${booking.id.slice(0, 8)}?\n\nDescribe the problem (required):`
    )?.trim();
    if (!reason) return;

    setDisputeBusyId(booking.id);
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id, reason }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not open dispute");
      showLobbToast({ type: "success", message: "Dispute opened — booking payout is frozen" });
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? { ...item, status: "disputed" } : item))
      );
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not open dispute" });
    } finally {
      setDisputeBusyId(null);
    }
  };

  useEffect(() => {
    let alive = true;
    const query = filter === "all" ? "" : `?status=${filter}`;
    setLoading(true);
    fetchWithCache<{ bookings: DashboardBooking[] }>(`lobb.admin.bookings.${filter}`, `/api/admin/bookings${query}`)
      .then((payload) => {
        if (alive) setBookings(payload.bookings ?? []);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load bookings" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [filter]);

  const totalValue = bookings.reduce((sum, booking) => sum + booking.total_amount_ngn, 0);
  const pendingPayoutCount = bookings.filter(isPayable).length;

  const triggerPayout = async (booking: DashboardBooking) => {
    const coach = firstJoin(booking.coaches);
    const label = coach?.full_name ?? "this coach";
    const confirmed = window.confirm(`Trigger payout for ${label} on booking #${booking.id.slice(0, 8)}?`);
    if (!confirmed) return;

    setPayoutBusyId(booking.id);
    try {
      const res = await fetch("/api/admin/payouts/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: booking.coach_id, booking_ids: [booking.id] }),
      });
      const json = await res.json() as { succeeded?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to trigger payout");
      showLobbToast({
        type: json.failed ? "error" : "success",
        message: `${json.succeeded ?? 0} payout triggered, ${json.failed ?? 0} failed`,
      });
      setBookings((current) =>
        current.map((item) => item.id === booking.id ? { ...item, paystack_transfer_code: "manual-payout-triggered" } : item)
      );
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to trigger payout" });
    } finally {
      setPayoutBusyId(null);
    }
  };

  return (
    <AdminShell active="All Bookings">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black text-[var(--lobb-clay)]">Master ledger</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Bookings</h1>
        </div>
        <p className="text-sm font-black text-[var(--lobb-muted)]">{bookings.length} records</p>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <LedgerMetric label="Filtered value" value={money(totalValue)} />
        <LedgerMetric label="Records" value={String(bookings.length)} />
        <LedgerMetric label="Needs payout" value={String(pendingPayoutCount)} urgent={pendingPayoutCount > 0} />
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`h-10 shrink-0 rounded-[12px] px-4 text-sm font-black capitalize ${filter === item ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"}`}>
            {item === "all" ? "All" : item}
          </button>
        ))}
      </div>

      <section className="mt-6 grid gap-3 xl:grid-cols-2">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, index) => <BookingCardSkeleton key={index} />)}
          </>
        ) : bookings.length ? bookings.map((booking) => {
          const payable = isPayable(booking);
          return (
          <article key={booking.id} className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 md:grid md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center md:gap-5">
            <div>
              <p className="truncate font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id.slice(0, 8)}</p>
              <p className="mt-1 text-sm font-black">{formatBookingDate(booking.starts_at)}</p>
            </div>
            <div className="mt-3 min-w-0 rounded-[12px] bg-[var(--lobb-bg)] px-3 py-2 md:mt-0">
              <p className="truncate text-sm font-black">
                {firstJoin(booking.coaches)?.full_name ?? "Coach"} to {firstJoin(booking.players)?.full_name ?? "Player"}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-[var(--lobb-muted)]">
                Payout {money(booking.coach_payout_ngn)}, ref {booking.paystack_reference ?? "not assigned"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 md:mt-0 md:justify-end">
              <StatusBadge status={booking.status} />
              <PayoutState booking={booking} />
              <p className="font-black">{money(booking.total_amount_ngn)}</p>
              {payable && (
                <button
                  type="button"
                  disabled={payoutBusyId === booking.id}
                  onClick={() => triggerPayout(booking)}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[var(--lobb-bg-inverse)] px-3 text-xs font-black text-[var(--lobb-text-inverse)] disabled:opacity-60"
                >
                  {payoutBusyId === booking.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Pay out
                </button>
              )}
              {["confirmed", "completed"].includes(booking.status) && (
                <button
                  type="button"
                  disabled={disputeBusyId === booking.id}
                  onClick={() => openDispute(booking)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[12px] border border-[var(--lobb-error)]/30 px-3 text-xs font-black text-[var(--lobb-error)] transition hover:bg-[var(--lobb-error)]/8 disabled:opacity-60"
                >
                  {disputeBusyId === booking.id ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-3.5" />}
                  Dispute
                </button>
              )}
            </div>
          </article>
          );
        }) : (
          <div className="border border-dashed border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center xl:col-span-2">
            <p className="text-lg font-black">No booking records</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--lobb-muted)]">Try another status filter, or wait for new paid sessions to arrive.</p>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function LedgerMetric({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className={`lobb-app-card border p-4 ${urgent ? "border-[var(--lobb-warning)]/45 bg-[var(--lobb-warning)]/10" : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]"}`}>
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--lobb-text-secondary)]">{label}</p>
    </div>
  );
}

function isPayable(booking: DashboardBooking) {
  return booking.status === "completed" && Boolean(booking.escrow_released_at) && !booking.paystack_transfer_code && booking.coach_payout_ngn > 0;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--lobb-bg)] px-2.5 py-1 text-xs font-black capitalize">
      <Circle className={`size-2 fill-current ${statusColor(status)}`} />
      {status}
    </span>
  );
}

function PayoutState({ booking }: { booking: DashboardBooking }) {
  const paid = Boolean(booking.paystack_transfer_code);
  const payable = isPayable(booking);
  const label = paid ? "Paid out" : payable ? "Ready" : booking.status === "completed" ? "Held" : "Not due";
  const className = paid
    ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
    : payable
      ? "bg-[var(--lobb-warning)]/14 text-[var(--lobb-text-primary)]"
      : "bg-[var(--lobb-bg)] text-[var(--lobb-muted)]";

  return <span className={`inline-flex rounded-[8px] px-2.5 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function statusColor(status: string) {
  if (status === "confirmed") return "text-[var(--lobb-clay)]";
  if (status === "disputed") return "text-[var(--lobb-warning)]";
  if (status === "cancelled") return "text-[var(--lobb-error)]";
  if (status === "completed") return "text-[var(--lobb-success)]";
  return "text-[var(--lobb-muted)]";
}
