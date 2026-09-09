"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, UserCheck, WalletCards } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { MetricGridSkeleton, TableRowsSkeleton } from "@/components/common/lobb-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type AdminDashboardPayload = {
  metrics: {
    total_bookings: number;
    gmv_ngn: number;
    active_coaches: number;
    active_players: number;
    lobb_earnings_ngn: number;
    pending_coach_approvals: number;
  } | null;
  recent_bookings?: DashboardBooking[];
  pending_coach_approvals?: Array<{
    id: string;
    full_name: string;
    headline: string | null;
    primary_location: string | null;
    profile_photo_url: string | null;
    hourly_rate_ngn: number | null;
  }>;
  stuck_payouts?: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/dashboard")
      .then((r) => r.json() as Promise<AdminDashboardPayload & { error?: string }>)
      .then((payload) => {
        if (!alive) return;
        if (payload.error) throw new Error(payload.error);
        setData(payload);
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
  const recentBookings = data?.recent_bookings ?? [];
  const pendingCoaches = data?.pending_coach_approvals ?? [];
  const stuckPayouts = data?.stuck_payouts ?? 0;
  const approvalCopy = (metrics?.pending_coach_approvals ?? 0) > 0 ? "Coach applications are waiting" : "Coach approvals are clear";

  return (
    <AdminShell>
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="flex min-h-[132px] flex-col justify-center border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] p-5 text-[var(--lobb-text-inverse)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium text-white/75">Admin</p>
                <h1 className="mt-2 text-[32px] font-semibold leading-none tracking-tight sm:text-[38px]">Operations dashboard</h1>
              </div>
              <Link href="/admin/coaches" className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] px-5 text-sm font-medium text-white">
                <UserCheck className="size-4" />
                Review applications
              </Link>
            </div>
          </div>

          <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
            <p className="text-xs font-medium text-[var(--lobb-text-secondary)]">Coach approvals</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight">{approvalCopy}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
              Review profiles before they appear to players.
            </p>
            <Link href="/admin/coaches" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-sm font-medium transition-colors hover:border-[var(--lobb-clay)]/35">
              Open approvals
              <ArrowUpRight className="size-4" />
            </Link>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {loading ? (
              <MetricGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={<Clock3 className="size-4" />} value={String(metrics?.pending_coach_approvals ?? 0)} label="Coach queue" hint="Awaiting admin review" tone="clay" />
                <Stat icon={<CalendarDays className="size-4" />} value={String(metrics?.total_bookings ?? 0)} label="Bookings" hint="Sessions created on LOBB" tone="neutral" />
                <Stat icon={<WalletCards className="size-4" />} value={money(metrics?.lobb_earnings_ngn ?? 0)} label="Platform fees" hint="Earned from completed sessions" tone="neutral" />
                <Stat icon={<CheckCircle2 className="size-4" />} value={String(metrics?.active_coaches ?? 0)} label="Verified coaches" hint="Live and bookable" tone="success" />
              </div>
            )}

            <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
              <SectionTitle title="Recent bookings" href="/admin/bookings" />
              {loading ? (
                <TableRowsSkeleton />
              ) : recentBookings.length ? (
                <BookingsTable bookings={recentBookings.slice(0, 7)} />
              ) : (
                <EmptyPanel title="No bookings yet" body="Paid player sessions will appear here as bookings are created." />
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
              <SectionTitle title="Applications" href="/admin/coaches" />
              {loading ? (
                <TableRowsSkeleton rows={4} />
              ) : pendingCoaches.length ? (
                <div className="space-y-4">
                  {pendingCoaches.slice(0, 4).map((coach) => <CoachReviewRow key={coach.id} coach={coach} />)}
                </div>
              ) : (
                <EmptyPanel title="No pending applications" body="Submitted coach profiles will appear here for review." compact />
              )}
            </section>

            {!loading && stuckPayouts > 0 && (
              <section className="border border-[var(--lobb-warning)]/45 bg-[var(--lobb-warning)]/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--lobb-warning)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--lobb-text-primary)]">
                      {stuckPayouts} stuck payout{stuckPayouts !== 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--lobb-text-secondary)]">
                      Completed sessions with no Paystack transfer.
                    </p>
                    <LobbButton variant="unstyled"
                      disabled={retrying}
                      onClick={async () => {
                        setRetrying(true);
                        try {
                          const res = await fetch("/api/admin/payouts/retry-stuck", { method: "POST" });
                          const json = await res.json() as { retried?: number; succeeded?: number; failed?: number };
                          showLobbToast(
                            (json.retried ?? 0) === 0
                              ? { type: "success", message: "No stuck payouts to retry" }
                              : {
                                  type: json.failed ? "error" : "success",
                                  message: `${json.succeeded ?? 0} transferred, ${json.failed ?? 0} failed`,
                                }
                          );
                        } catch {
                          showLobbToast({ type: "error", message: "Retry failed. Check server logs." });
                        } finally {
                          setRetrying(false);
                        }
                      }}
                      className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-3 text-xs font-medium text-[var(--lobb-text-inverse)] disabled:opacity-60"
                    >
                      {retrying ? "Retrying" : "Retry stuck payouts"}
                    </LobbButton>
                  </div>
                </div>
              </section>
            )}

            <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Revenue</h2>
                <Link href="/admin/earnings" className="flex size-8 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]" aria-label="Open earnings">
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                <RevenueRow label="Gross booking value" value={money(metrics?.gmv_ngn ?? 0)} />
                <RevenueRow label="Platform fees earned" value={money(metrics?.lobb_earnings_ngn ?? 0)} strong />
                <RevenueRow label="Bookings created" value={String(metrics?.total_bookings ?? 0)} />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}

function Stat({ icon, value, label, hint, tone }: { icon: React.ReactNode; value: string; label: string; hint: string; tone: "success" | "clay" | "neutral" }) {
  const toneClass = tone === "success" ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : tone === "clay" ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]" : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]";

  return (
    <div className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-8 items-center justify-center rounded-[var(--lobb-radius-md)] ${toneClass}`}>{icon}</span>
      </div>
      <p className="mt-5 text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-3 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{hint}</p>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-secondary)]">{title}</span>
      {href && (
        <Link href={href} className="flex size-8 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]" aria-label={`Open ${title}`}>
          <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

// Compact row list — no fixed-width table, so it works on any screen without
// sideways scrolling, and player/coach names don't fight for space.
function BookingsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return (
    <div className="divide-y divide-[var(--lobb-border-subtle)]">
      {bookings.map((booking) => {
        const coach = firstJoin(booking.coaches);
        const player = firstJoin(booking.players);
        const coachName = coach?.full_name ?? "Coach";
        const playerName = player?.full_name ?? "Player";

        return (
          <div key={booking.id} className="flex items-center gap-3 py-3">
            <Avatar name={playerName} imageUrl={player?.avatar_url ?? null} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">
                {playerName}
                <span className="mx-1.5 font-normal text-[var(--lobb-text-tertiary)]">· coached by</span>
                {coachName}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--lobb-text-secondary)]">
                {formatBookingDate(booking.starts_at)}
                <span className="mx-1.5">·</span>
                <span className="font-mono">{booking.paystack_reference ?? `#${booking.id.slice(0, 6)}`}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-medium">{money(booking.total_amount_ngn)}</span>
              <StatusBadge status={booking.status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Avatar({ name, imageUrl, size = "md" }: { name: string; imageUrl?: string | null; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "LA";
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-bg-primary)] font-medium text-[var(--lobb-clay)] ${sizeClass}`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

function CoachReviewRow({ coach }: { coach: NonNullable<AdminDashboardPayload["pending_coach_approvals"]>[number] }) {
  return (
    <Link href="/admin/coaches" className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-bg-primary)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
        ) : (
          <UserCheck className="size-4 text-[var(--lobb-clay)]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{coach.full_name}</span>
        <span className="block truncate text-xs font-medium text-[var(--lobb-text-secondary)]">{coach.primary_location ?? coach.headline ?? "Coach profile"}</span>
      </span>
      <span className="rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--lobb-text-secondary)]">Open</span>
    </Link>
  );
}

function RevenueRow({ value, label, strong }: { value: string; label: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--lobb-border-subtle)] pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-bold text-[var(--lobb-text-secondary)]">{label}</p>
      <p className={`shrink-0 text-sm font-medium ${strong ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-bg-inverse)]"}`}>{value}</p>
    </div>
  );
}

function EmptyPanel({ title, body, compact }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`rounded-[var(--lobb-radius-md)] border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] ${compact ? "p-4" : "p-6"}`}>
      <AlertTriangle className="size-4 text-[var(--lobb-text-secondary)]" />
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">{body}</p>
    </div>
  );
}
