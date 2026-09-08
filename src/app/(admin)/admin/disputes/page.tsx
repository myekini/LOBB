"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Gavel, Loader2 } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/features/admin/admin-shell";
import { FormAlert } from "@/components/ui/form-alert";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";

type Party = { full_name: string | null } | { full_name: string | null }[] | null;

type DisputeBooking = {
  id: string;
  booking_ref: string | null;
  starts_at: string;
  location: string | null;
  status: string;
  total_amount_ngn: number;
  coach_payout_ngn: number;
  coaches: Party;
  players: Party;
};

type Dispute = {
  id: string;
  booking_id: string;
  reason: string;
  status: "open" | "resolved";
  resolution: string | null;
  player_refund_percent: number | null;
  coach_release_percent: number | null;
  internal_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  bookings: DisputeBooking | DisputeBooking[] | null;
};

type Resolution = "refund_player" | "release_to_coach" | "split";

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function money(value: number) {
  return `₦${(value ?? 0).toLocaleString("en-NG")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

const RESOLUTION_OPTIONS: Array<{ value: Resolution; label: string; description: string }> = [
  { value: "refund_player", label: "Refund player", description: "Full refund via Paystack; booking cancelled, coach gets nothing." },
  { value: "release_to_coach", label: "Release to coach", description: "Coach is paid in full on the next payout run; no refund." },
  { value: "split", label: "Split", description: "Refund part to the player and release part to the coach." },
];

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState<Resolution>("refund_player");
  const [refundPercent, setRefundPercent] = useState(50);
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/disputes")
      .then((r) => r.json() as Promise<{ disputes?: Dispute[]; error?: string }>)
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setDisputes(json.disputes ?? []);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load disputes" });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openResolve = (dispute: Dispute) => {
    setResolvingId(dispute.id);
    setResolution("refund_player");
    setRefundPercent(50);
    setNotes("");
  };

  const submitResolution = async (dispute: Dispute) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          ...(resolution === "split"
            ? { player_refund_percent: refundPercent, coach_release_percent: 100 - refundPercent }
            : {}),
          internal_notes: notes,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; refund_error?: string | null; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not resolve dispute");
      if (json.refund_error) {
        showLobbToast({ type: "warning", title: "Resolved, but refund failed", message: json.refund_error });
      } else {
        showLobbToast({ type: "success", message: "Dispute resolved" });
      }
      setResolvingId(null);
      load();
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not resolve dispute" });
    } finally {
      setBusy(false);
    }
  };

  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");

  return (
    <AdminShell active="Disputes">
      <AdminBackHeader title="Disputes" />

      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-32 rounded-[18px]" />
          <SkeletonBlock className="h-32 rounded-[18px]" />
        </div>
      ) : disputes.length === 0 ? (
        <section className="mx-auto max-w-2xl rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]">
            <Gavel className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight">No disputes</h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[var(--lobb-muted)]">
            Open a dispute from a booking when a player or coach reports a problem with a session.
          </p>
        </section>
      ) : (
        <div className="mx-auto max-w-3xl space-y-8">
          {open.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
                Open · {open.length}
              </h2>
              <div className="space-y-4">
                {open.map((dispute) => {
                  const booking = first(dispute.bookings);
                  const coach = first(booking?.coaches ?? null);
                  const player = first(booking?.players ?? null);
                  const isResolving = resolvingId === dispute.id;
                  return (
                    <article key={dispute.id} className="rounded-[18px] border border-[var(--lobb-error)]/25 bg-[var(--lobb-surface)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-error)]">
                            Open dispute · {formatDate(dispute.created_at)}
                          </p>
                          <p className="mt-1.5 text-[15px] font-black">
                            {player?.full_name ?? "Player"} vs {coach?.full_name ?? "Coach"}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-[var(--lobb-muted)]">
                            {booking?.booking_ref ?? booking?.id.slice(0, 8)} · {booking ? formatDate(booking.starts_at) : ""} · {money(booking?.total_amount_ngn ?? 0)}
                          </p>
                        </div>
                        {!isResolving && (
                          <button
                            type="button"
                            onClick={() => openResolve(dispute)}
                            className="inline-flex h-10 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-black text-[var(--lobb-text-inverse)]"
                          >
                            Resolve
                          </button>
                        )}
                      </div>

                      <p className="mt-3 rounded-[12px] bg-[var(--lobb-surface-2)] p-3 text-[13px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
                        {dispute.reason}
                      </p>

                      {isResolving && (
                        <div className="mt-4 space-y-3 border-t border-[var(--lobb-border)] pt-4">
                          <div className="grid gap-2 sm:grid-cols-3">
                            {RESOLUTION_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setResolution(option.value)}
                                className={`rounded-[14px] border p-3 text-left transition ${
                                  resolution === option.value
                                    ? "border-[var(--lobb-clay)]/50 bg-[var(--lobb-clay)]/8"
                                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] hover:border-[var(--lobb-clay)]/35"
                                }`}
                              >
                                <p className="text-[13px] font-black">{option.label}</p>
                                <p className="mt-1 text-[11px] font-semibold leading-snug text-[var(--lobb-muted)]">{option.description}</p>
                              </button>
                            ))}
                          </div>

                          {resolution === "split" && (
                            <div className="rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-4">
                              <div className="flex items-center justify-between text-[12px] font-black">
                                <span>Player refund: {refundPercent}%</span>
                                <span>Coach release: {100 - refundPercent}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={refundPercent}
                                onChange={(e) => setRefundPercent(Number(e.target.value))}
                                className="mt-3 w-full accent-[var(--lobb-clay)]"
                              />
                              <p className="mt-2 text-[11px] font-semibold text-[var(--lobb-muted)]">
                                Player gets {money(Math.round(((booking?.total_amount_ngn ?? 0) * refundPercent) / 100))} back ·
                                Coach receives {money(Math.round(((booking?.coach_payout_ngn ?? 0) * (100 - refundPercent)) / 100))}
                              </p>
                            </div>
                          )}

                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal notes (what was agreed, who you spoke to)…"
                            rows={2}
                            className="w-full rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-3 text-[13px] font-semibold text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)]/50"
                          />

                          <FormAlert variant="warning" title="This moves money">
                            Refunds go back to the player&apos;s card immediately. Coach releases are paid on the next payout run.
                          </FormAlert>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => submitResolution(dispute)}
                              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm resolution"}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setResolvingId(null)}
                              className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[var(--lobb-border)] px-4 text-sm font-black"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
                Resolved · {resolved.length}
              </h2>
              <div className="space-y-3">
                {resolved.map((dispute) => {
                  const booking = first(dispute.bookings);
                  const coach = first(booking?.coaches ?? null);
                  const player = first(booking?.players ?? null);
                  return (
                    <article key={dispute.id} className="flex items-start gap-3 rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--lobb-success)]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black">
                          {player?.full_name ?? "Player"} vs {coach?.full_name ?? "Coach"}
                          <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-[var(--lobb-muted)]">
                            {dispute.resolution?.replace(/_/g, " ")}
                            {dispute.resolution === "split" && ` · ${dispute.player_refund_percent}% / ${dispute.coach_release_percent}%`}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold text-[var(--lobb-muted)]">
                          {dispute.reason.slice(0, 120)}{dispute.reason.length > 120 ? "…" : ""}
                        </p>
                        {dispute.internal_notes && (
                          <p className="mt-1 text-[11px] font-medium text-[var(--lobb-text-tertiary)]">Note: {dispute.internal_notes}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-[var(--lobb-muted)]">
                        {dispute.resolved_at ? formatDate(dispute.resolved_at) : ""}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </AdminShell>
  );
}
