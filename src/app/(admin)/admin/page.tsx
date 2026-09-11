"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Gavel, UserCheck, WalletCards } from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  useAdminResource,
} from "@/features/admin/admin-shell";
import { retryStuckPayouts } from "@/features/admin/payout-actions";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { MetricGridSkeleton, TableRowsSkeleton } from "@/components/common/lobb-skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonCell } from "@/components/common/person-cell";

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
  open_disputes?: number;
};

export default function AdminDashboardPage() {
  const { data, loading, refreshing, reload } = useAdminResource<AdminDashboardPayload>("/api/admin/dashboard");
  const [retrying, setRetrying] = useState(false);

  const metrics = data?.metrics;
  const recentBookings = data?.recent_bookings ?? [];
  const pendingCoaches = data?.pending_coach_approvals ?? [];
  const stuckPayouts = data?.stuck_payouts ?? 0;
  const openDisputes = data?.open_disputes ?? 0;
  const actionCount = stuckPayouts + openDisputes + pendingCoaches.length;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Bookings, coach approvals and payout health."
      >
        <AdminRefreshButton onClick={() => reload("refresh")} busy={loading || refreshing} />
        <Link
          href="/admin/coaches"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-medium text-[var(--lobb-text-inverse)] transition hover:bg-[var(--lobb-clay)] hover:text-white"
        >
          <UserCheck className="size-4" />
          Review applications
        </Link>
      </AdminPageHeader>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {loading ? (
            <MetricGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AdminMetricCard icon={<Clock3 className="size-4" />} value={String(metrics?.pending_coach_approvals ?? 0)} label="Coach queue" hint="Awaiting admin review" tone="clay" />
              <AdminMetricCard icon={<CalendarDays className="size-4" />} value={String(metrics?.total_bookings ?? 0)} label="Bookings" hint="Sessions created on LOBB" tone="neutral" />
              <AdminMetricCard icon={<WalletCards className="size-4" />} value={money(metrics?.lobb_earnings_ngn ?? 0)} label="Platform fees" hint="Earned from completed sessions" tone="neutral" />
              <AdminMetricCard icon={<CheckCircle2 className="size-4" />} value={String(metrics?.active_coaches ?? 0)} label="Verified coaches" hint="Live and bookable" tone="success" />
            </div>
          )}

          <section>
            <SectionTitle title="Latest booking activity" href="/admin/bookings" />
            {loading ? (
              <TableRowsSkeleton />
            ) : recentBookings.length ? (
              <BookingsTable bookings={recentBookings.slice(0, 5)} />
            ) : (
              <AdminEmptyState icon={AlertTriangle} title="No bookings yet" body="Paid player sessions will appear here as bookings are created." />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-secondary)]">Action required</p>
                <p className="mt-1 text-sm font-semibold">{loading ? "Checking operations…" : actionCount ? `${actionCount} item${actionCount === 1 ? "" : "s"} need attention` : "Everything is clear"}</p>
              </div>
              {!loading && actionCount === 0 && <CheckCircle2 className="size-5 text-[var(--lobb-success)]" />}
            </div>
            {!loading && actionCount > 0 && (
              <div className="mt-4 divide-y divide-[var(--lobb-border-subtle)] border-y border-[var(--lobb-border-subtle)]">
                {stuckPayouts > 0 && <ActionRow href="/admin/earnings" icon={<WalletCards className="size-4" />} label="Stuck payouts" count={stuckPayouts} urgent />}
                {openDisputes > 0 && <ActionRow href="/admin/disputes" icon={<Gavel className="size-4" />} label="Open disputes" count={openDisputes} urgent />}
                {pendingCoaches.length > 0 && <ActionRow href="/admin/coaches" icon={<UserCheck className="size-4" />} label="Coach applications" count={pendingCoaches.length} />}
              </div>
            )}
          </section>

          <section className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <SectionTitle title="Applications" href="/admin/coaches" />
            {loading ? (
              <TableRowsSkeleton rows={4} />
            ) : pendingCoaches.length ? (
              <div className="space-y-4">
                {pendingCoaches.slice(0, 4).map((coach) => <CoachReviewRow key={coach.id} coach={coach} />)}
              </div>
            ) : (
              <AdminEmptyState icon={AlertTriangle} title="No pending applications" body="Submitted coach profiles will appear here for review." />
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
                        await retryStuckPayouts();
                      } finally {
                        setRetrying(false);
                        reload("refresh");
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
    </AdminShell>
  );
}

function ActionRow({ href, icon, label, count, urgent = false }: { href: string; icon: React.ReactNode; label: string; count: number; urgent?: boolean }) {
  return (
    <Link href={href} className="group flex min-h-12 items-center gap-3 py-2.5">
      <span className={urgent ? "text-[var(--lobb-error)]" : "text-[var(--lobb-clay)]"}>{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold">{count}</span>
      <ArrowRight className="size-4 text-[var(--lobb-text-tertiary)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5" />
    </Link>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-secondary)]">{title}</span>
      {href && (
        <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] px-3 text-xs font-medium text-[var(--lobb-text-secondary)]" aria-label={`Open ${title}`}>
          View all
          <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function BookingsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return (
    <>
    <div className="space-y-2 md:hidden">
      {bookings.map((booking) => {
        const coach = firstJoin(booking.coaches);
        const player = firstJoin(booking.players);
        return (
          <article key={booking.id} className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{player?.full_name ?? "Player"}</p><p className="mt-0.5 truncate text-xs text-[var(--lobb-text-secondary)]">{coach?.full_name ?? "Coach"}</p></div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--lobb-border-subtle)] pt-3">
              <p className="text-xs font-medium text-[var(--lobb-text-secondary)]">{formatBookingDate(booking.starts_at)}</p>
              <p className="shrink-0 text-sm font-semibold">{money(booking.total_amount_ngn)}</p>
            </div>
          </article>
        );
      })}
    </div>
    <div className="hidden md:block">
    <Table>
      <TableCaption className="sr-only">Five latest bookings with session, total and status.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Session</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => {
          const coach = firstJoin(booking.coaches);
          const player = firstJoin(booking.players);
          return (
            <TableRow key={booking.id}>
              <TableCell>
                <PersonCell
                  name={player?.full_name ?? "Player"}
                  imageUrl={player?.avatar_url ?? null}
                  secondary={coach?.full_name ?? "Coach"}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                {formatBookingDate(booking.starts_at)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                {money(booking.total_amount_ngn)}
              </TableCell>
              <TableCell className="text-right">
                <StatusBadge status={booking.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
    </>
  );
}

function CoachReviewRow({ coach }: { coach: NonNullable<AdminDashboardPayload["pending_coach_approvals"]>[number] }) {
  return (
    <Link href="/admin/coaches" className="flex items-center gap-3">
      <PersonCell
        name={coach.full_name}
        imageUrl={coach.profile_photo_url}
        secondary={coach.primary_location ?? coach.headline ?? "Coach profile"}
        className="flex-1"
      />
      <span className="shrink-0 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-3 py-2 text-xs font-medium text-[var(--lobb-text-secondary)]">Open</span>
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
