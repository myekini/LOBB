"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Textarea as LobbTextarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useState } from "react";
import { Download, Gavel, Loader2, RefreshCw, Send } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { Modal } from "@/components/ui/modal";
import { FormAlert } from "@/components/ui/form-alert";
import { formatBookingDate, money, sessionParties, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type Filter = "all" | "pending" | "confirmed" | "completed" | "disputed" | "cancelled";

const filters: Filter[] = ["all", "pending", "confirmed", "completed", "disputed", "cancelled"];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [summary, setSummary] = useState<{ record_count: number; gross_ngn: number; payout_ngn: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [disputeTarget, setDisputeTarget] = useState<DashboardBooking | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeBusy, setDisputeBusy] = useState(false);

  const [payoutTarget, setPayoutTarget] = useState<DashboardBooking | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const buildUrl = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (from) params.set("from", from);
      if (to) params.set("to", `${to}T23:59:59`);
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();
      return `/api/admin/bookings${qs ? `?${qs}` : ""}`;
    },
    [filter, from, to]
  );

  type ListResponse = {
    bookings?: DashboardBooking[];
    next_cursor?: string | null;
    summary?: { record_count: number; gross_ngn: number; payout_ngn: number } | null;
    error?: string;
  };

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setNextCursor(null);
      try {
        const res = await fetch(buildUrl());
        const json = (await res.json()) as ListResponse;
        if (!res.ok) throw new Error(json.error ?? "Unable to load bookings");
        setBookings(json.bookings ?? []);
        setNextCursor(json.next_cursor ?? null);
        setSummary(json.summary ?? null);
      } catch (error) {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load bookings" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildUrl]
  );

  useEffect(() => {
    load("initial");
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      const json = (await res.json()) as { bookings?: DashboardBooking[]; next_cursor?: string | null; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to load more bookings");
      setBookings((current) => [...current, ...(json.bookings ?? [])]);
      setNextCursor(json.next_cursor ?? null);
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load more bookings" });
    } finally {
      setLoadingMore(false);
    }
  };

  const pendingPayoutCount = bookings.filter(isPayable).length;

  const submitDispute = async () => {
    if (!disputeTarget) return;
    const reason = disputeReason.trim();
    if (!reason) return;
    setDisputeBusy(true);
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: disputeTarget.id, reason }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not open dispute");
      showLobbToast({ type: "success", message: "Dispute opened — this booking's payout is frozen" });
      setBookings((current) =>
        current.map((item) => (item.id === disputeTarget.id ? { ...item, status: "disputed" } : item))
      );
      setDisputeTarget(null);
      setDisputeReason("");
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not open dispute" });
    } finally {
      setDisputeBusy(false);
    }
  };

  const submitPayout = async () => {
    if (!payoutTarget) return;
    setPayoutBusy(true);
    try {
      const res = await fetch("/api/admin/payouts/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_id: payoutTarget.coach_id, booking_ids: [payoutTarget.id] }),
      });
      const json = (await res.json()) as { succeeded?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to trigger payout");
      const paidOut = (json.succeeded ?? 0) > 0 && !json.failed;
      showLobbToast({
        type: paidOut ? "success" : "error",
        message: paidOut
          ? "Payout sent to coach"
          : `Payout failed (${json.failed ?? 0} of ${(json.succeeded ?? 0) + (json.failed ?? 0)}). Check server logs and retry.`,
      });
      // Only reflect "paid out" in the UI when the transfer actually went through.
      if (paidOut) {
        setBookings((current) =>
          current.map((item) => (item.id === payoutTarget.id ? { ...item, paystack_transfer_code: "manual-payout-triggered" } : item))
        );
      }
      setPayoutTarget(null);
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to trigger payout" });
    } finally {
      setPayoutBusy(false);
    }
  };

  const exportCsv = () => {
    const header = ["id", "starts_at", "status", "coach", "player", "total_ngn", "coach_payout_ngn", "paystack_reference"];
    const rows = bookings.map((b) => {
      const { coach, player } = sessionParties(b);
      return [
        b.id,
        b.starts_at,
        b.status,
        coach,
        player,
        b.total_amount_ngn,
        b.coach_payout_ngn,
        b.paystack_reference ?? "",
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lobb-bookings-${filter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Ledger</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Bookings</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-[var(--lobb-text-secondary)]">{bookings.length}{nextCursor ? "+" : ""} loaded</p>
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

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <LedgerMetric label="Filtered value" value={money(summary?.gross_ngn ?? 0)} />
        <LedgerMetric label="Records" value={String(summary?.record_count ?? bookings.length)} />
        <LedgerMetric label="Needs payout (loaded)" value={String(pendingPayoutCount)} urgent={pendingPayoutCount > 0} />
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <LobbButton variant="unstyled" key={item} onClick={() => setFilter(item)} className={`h-10 shrink-0 rounded-[var(--lobb-radius-md)] px-4 text-sm font-semibold capitalize ${filter === item ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)]"}`}>
            {item === "all" ? "All" : item}
          </LobbButton>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-[var(--lobb-text-secondary)]">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 text-sm font-medium" />
        </label>
        <label className="text-xs font-medium text-[var(--lobb-text-secondary)]">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-10 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 text-sm font-medium" />
        </label>
        {(from || to) && (
          <LobbButton variant="unstyled" onClick={() => { setFrom(""); setTo(""); }} className="h-10 rounded-[var(--lobb-radius-md)] px-3 text-xs font-semibold text-[var(--lobb-text-secondary)] underline">
            Clear dates
          </LobbButton>
        )}
        <LobbButton
          variant="unstyled"
          onClick={exportCsv}
          disabled={!bookings.length}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-xs font-semibold disabled:opacity-60"
        >
          <Download className="size-4" />
          Export loaded ({bookings.length})
        </LobbButton>
      </div>

      <section className="mt-6 grid gap-3 xl:grid-cols-2">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, index) => <BookingCardSkeleton key={index} />)}
          </>
        ) : bookings.length ? bookings.map((booking) => {
          const payable = isPayable(booking);
          const { coach, player } = sessionParties(booking);
          return (
          <article key={booking.id} className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 md:grid md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center md:gap-5">
            <div>
              <p className="truncate font-mono text-xs font-medium text-[var(--lobb-text-secondary)]">#{booking.id.slice(0, 8)}</p>
              <p className="mt-1 text-sm font-medium">{formatBookingDate(booking.starts_at)}</p>
            </div>
            <div className="mt-3 min-w-0 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] px-3 py-2 md:mt-0">
              <p className="truncate text-sm font-medium">
                {player} <span className="font-normal text-[var(--lobb-text-tertiary)]">· coached by</span> {coach}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-[var(--lobb-text-secondary)]">
                Payout {money(booking.coach_payout_ngn)}
                {booking.paystack_reference ? ` · ref ${booking.paystack_reference}` : ""}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 md:mt-0 md:justify-end">
              <StatusBadge status={booking.status} />
              <PayoutState booking={booking} />
              <p className="font-medium">{money(booking.total_amount_ngn)}</p>
              {payable && (
                <LobbButton variant="unstyled"
                  type="button"
                  disabled={payoutBusy}
                  onClick={() => setPayoutTarget(booking)}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-3 text-xs font-medium text-[var(--lobb-text-inverse)] disabled:opacity-60"
                >
                  <Send className="size-4" />
                  Pay out
                </LobbButton>
              )}
              {["confirmed", "completed"].includes(booking.status) && (
                <LobbButton variant="unstyled"
                  type="button"
                  disabled={disputeBusy}
                  onClick={() => { setDisputeTarget(booking); setDisputeReason(""); }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-error)]/30 px-3 text-xs font-medium text-[var(--lobb-error)] transition hover:bg-[var(--lobb-error)]/8 disabled:opacity-60"
                >
                  <Gavel className="size-3.5" />
                  Dispute
                </LobbButton>
              )}
            </div>
          </article>
          );
        }) : (
          <div className="border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-8 text-center xl:col-span-2">
            <p className="text-lg font-medium">No booking records</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">Try another status filter or date range, or wait for new paid sessions to arrive.</p>
          </div>
        )}
      </section>

      {!loading && nextCursor && (
        <div className="mt-6 flex justify-center">
          <LobbButton
            variant="unstyled"
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-6 text-sm font-semibold disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            {loadingMore ? "Loading" : "Load older bookings"}
          </LobbButton>
        </div>
      )}

      {disputeTarget && (
        <Modal title="Open a dispute" onClose={() => (disputeBusy ? null : setDisputeTarget(null))}>
          <DisputeSummary booking={disputeTarget} />
          <FormAlert variant="warning" title="This freezes the payout">
            The coach will not be paid for this session until an admin resolves the dispute.
          </FormAlert>
          <LobbTextarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="What went wrong? Who reported it, and what do they want?"
            rows={3}
            className="mt-3 w-full rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3 text-sm font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)]"
          />
          <div className="mt-4 flex gap-2">
            <LobbButton
              variant="unstyled"
              disabled={!disputeReason.trim() || disputeBusy}
              onClick={submitDispute}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-error)] text-sm font-semibold text-white disabled:opacity-50"
            >
              {disputeBusy && <Loader2 className="size-4 animate-spin" />}
              Freeze payout &amp; open dispute
            </LobbButton>
            <LobbButton variant="unstyled" disabled={disputeBusy} onClick={() => setDisputeTarget(null)} className="inline-flex h-11 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-sm font-medium">
              Cancel
            </LobbButton>
          </div>
        </Modal>
      )}

      {payoutTarget && (
        <Modal title="Send payout" onClose={() => (payoutBusy ? null : setPayoutTarget(null))}>
          <DisputeSummary booking={payoutTarget} />
          <FormAlert variant="warning" title="This moves money now">
            {money(payoutTarget.coach_payout_ngn)} transfers to {sessionParties(payoutTarget).coach} via Paystack immediately. It cannot be undone from here.
          </FormAlert>
          <div className="mt-4 flex gap-2">
            <LobbButton
              variant="unstyled"
              disabled={payoutBusy}
              onClick={submitPayout}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-semibold text-[var(--lobb-text-inverse)] disabled:opacity-50"
            >
              {payoutBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send {money(payoutTarget.coach_payout_ngn)}
            </LobbButton>
            <LobbButton variant="unstyled" disabled={payoutBusy} onClick={() => setPayoutTarget(null)} className="inline-flex h-11 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-sm font-medium">
              Cancel
            </LobbButton>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

function DisputeSummary({ booking }: { booking: DashboardBooking }) {
  const { coach, player } = sessionParties(booking);
  return (
    <div className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)] p-3 text-sm">
      <p className="font-medium">{player} · coached by {coach}</p>
      <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">
        #{booking.id.slice(0, 8)} · {formatBookingDate(booking.starts_at)} · {money(booking.total_amount_ngn)}
      </p>
    </div>
  );
}

function LedgerMetric({ label, value, urgent }: { label: string; value: string; urgent?: boolean }) {
  return (
    <div className={`lobb-surface-outlined border p-4 ${urgent ? "border-[var(--lobb-warning)]/45 bg-[var(--lobb-warning)]/10" : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]"}`}>
      <p className="text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--lobb-text-secondary)]">{label}</p>
    </div>
  );
}

function isPayable(booking: DashboardBooking) {
  return booking.status === "completed" && Boolean(booking.escrow_released_at) && !booking.paystack_transfer_code && booking.coach_payout_ngn > 0;
}

const PAYOUT_STATE_HINT: Record<string, string> = {
  "Paid out": "Paystack transfer to the coach has been sent.",
  Ready: "Session complete and escrow released — safe to pay the coach now.",
  Held: "Session complete but escrow has not been released yet (2h auto-hold, or a dispute).",
  "Not due": "Session is not complete, so no payout is owed yet.",
};

function PayoutState({ booking }: { booking: DashboardBooking }) {
  const paid = Boolean(booking.paystack_transfer_code);
  const payable = isPayable(booking);
  const label = paid ? "Paid out" : payable ? "Ready" : booking.status === "completed" ? "Held" : "Not due";
  const className = paid
    ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
    : payable
      ? "bg-[var(--lobb-warning)]/14 text-[var(--lobb-text-primary)]"
      : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]";

  return (
    <span title={PAYOUT_STATE_HINT[label]} className={`inline-flex rounded-[var(--lobb-radius-sm)] px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
