"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, UserCheck, WalletCards } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { MetricGridSkeleton, TableRowsSkeleton } from "@/components/common/lobb-skeleton";

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
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWithCache<AdminDashboardPayload>("lobb.admin.dashboard", "/api/admin/dashboard")
      .then((payload) => {
        if (alive) setData(payload);
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
  const approvalCopy = (metrics?.pending_coach_approvals ?? 0) > 0 ? "Coach applications are waiting" : "Coach approvals are clear";

  return (
    <AdminShell active="Dashboard">
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="flex min-h-[132px] flex-col justify-between rounded-[16px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_2px_12px_rgba(13,13,13,0.08)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold text-white/52">LOBB headquarters</p>
                <h1 className="mt-2 text-[32px] font-black leading-none tracking-tight sm:text-[38px]">Operations Dashboard</h1>
              </div>
              <Link href="/admin/coaches" className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-clay)] px-5 text-sm font-black text-white shadow-[0_8px_18px_rgba(196,98,45,0.2)]">
                <UserCheck className="size-4" />
                Review applications
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill label="Coach queue" value={String(metrics?.pending_coach_approvals ?? 0)} />
              <Pill label="Bookings" value={String(metrics?.total_bookings ?? 0)} />
              <Pill label="Platform fees" value={money(metrics?.lobb_earnings_ngn ?? 0)} />
            </div>
          </div>

          <section className="rounded-[16px] bg-[var(--lobb-surface)] p-5 shadow-[0_2px_12px_rgba(13,13,13,0.04)]">
            <p className="text-xs font-bold text-[var(--lobb-muted)]">Priority</p>
            <h2 className="mt-2 text-xl font-black leading-tight">{approvalCopy}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">
              Review submitted coach profiles so players only see verified, ready-to-book coaches.
            </p>
            <Link href="/admin/coaches" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] px-4 text-sm font-black">
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
                <Stat icon={<Clock3 className="size-4" />} value={String(metrics?.pending_coach_approvals ?? 0)} label="Coach Queue" hint="Awaiting admin review" tone="clay" />
                <Stat icon={<CalendarDays className="size-4" />} value={String(metrics?.total_bookings ?? 0)} label="Bookings" hint="Sessions created on LOBB" tone="neutral" />
                <Stat icon={<WalletCards className="size-4" />} value={money(metrics?.lobb_earnings_ngn ?? 0)} label="Platform Fees" hint="Earned from completed sessions" tone="neutral" />
                <Stat icon={<CheckCircle2 className="size-4" />} value={String(metrics?.active_coaches ?? 0)} label="Verified Coaches" hint="Live and bookable" tone="success" />
              </div>
            )}

            <section className="rounded-[14px] bg-[var(--lobb-surface)] p-4 shadow-[0_2px_12px_rgba(13,13,13,0.04)]">
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
            <section className="rounded-[14px] bg-[var(--lobb-surface)] p-4 shadow-[0_2px_12px_rgba(13,13,13,0.04)]">
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

            <section className="rounded-[14px] bg-[var(--lobb-surface)] p-4 shadow-[0_2px_12px_rgba(13,13,13,0.04)]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black">Revenue</h2>
                <Link href="/admin/earnings" className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--lobb-bg)] text-[var(--lobb-muted)]" aria-label="Open earnings">
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                <RevenueRow label="Gross booking value" value={money(metrics?.gmv_ngn ?? 0)} />
                <RevenueRow label="Platform fees earned" value={money(metrics?.lobb_earnings_ngn ?? 0)} strong />
                <RevenueRow label="Bookings created" value={String(metrics?.total_bookings ?? 0)} />
              </div>
              <div className="mt-4 rounded-[12px] bg-[var(--lobb-bg)] p-3 text-xs font-semibold leading-5 text-[var(--lobb-muted)]">
                Finance detail lives in Earnings. Keep this card for a quick revenue check only.
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/84">
      <span className="text-white/52">{label}</span>
      {value}
    </span>
  );
}

function Stat({ icon, value, label, hint, tone }: { icon: React.ReactNode; value: string; label: string; hint: string; tone: "success" | "clay" | "neutral" }) {
  const toneClass = tone === "success" ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : tone === "clay" ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]" : "bg-[var(--lobb-bg)] text-[var(--lobb-muted)]";

  return (
    <div className="rounded-[14px] bg-[var(--lobb-surface)] p-4 shadow-[0_2px_12px_rgba(13,13,13,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-8 items-center justify-center rounded-[10px] ${toneClass}`}>{icon}</span>
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--lobb-bg)] text-[var(--lobb-muted)]">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-black leading-none">{value}</p>
      <p className="mt-3 text-sm font-black">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">{hint}</p>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">{title}</span>
      {href && (
        <Link href={href} className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--lobb-bg)] text-[var(--lobb-muted)]" aria-label={`Open ${title}`}>
          <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function BookingsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--lobb-border)] text-[11px] font-black text-[var(--lobb-muted)]">
            <th className="py-3 pr-4">Client</th>
            <th className="px-4 py-3">Booking ID</th>
            <th className="px-4 py-3">Session</th>
            <th className="px-4 py-3">Coach</th>
            <th className="px-4 py-3">Status</th>
            <th className="py-3 pl-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const coach = firstJoin(booking.coaches);
            const player = firstJoin(booking.players);
            const coachName = coach?.full_name ?? "Coach";
            const playerName = player?.full_name ?? "Player";

            return (
              <tr key={booking.id} className="border-b border-[var(--lobb-border)] last:border-b-0">
                <td className="py-3 pr-4">
                  <PersonCell name={playerName} imageUrl={player?.avatar_url ?? null} />
                </td>
                <td className="px-4 py-3 font-mono text-xs font-black text-[var(--lobb-muted)]">
                  {booking.paystack_reference ?? `#${booking.id.slice(0, 6)}`}
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-[var(--lobb-muted)]">{formatBookingDate(booking.starts_at)}</td>
                <td className="px-4 py-3">
                  <PersonCell name={coachName} imageUrl={coach?.profile_photo_url ?? null} compact />
                </td>
                <td className="px-4 py-3"><StatusBadge status={booking.status} /></td>
                <td className="py-3 pl-4 text-right font-black">{money(booking.total_amount_ngn)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PersonCell({ name, imageUrl, compact }: { name: string; imageUrl?: string | null; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} imageUrl={imageUrl} size={compact ? "sm" : "md"} />
      <span className="truncate font-black">{name}</span>
    </span>
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
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-bg)] font-black text-[var(--lobb-clay)] ${sizeClass}`}>
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
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--lobb-bg)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
        ) : (
          <UserCheck className="size-4 text-[var(--lobb-clay)]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{coach.full_name}</span>
        <span className="block truncate text-xs font-semibold text-[var(--lobb-muted)]">{coach.primary_location ?? coach.headline ?? "Coach profile"}</span>
      </span>
      <span className="rounded-[10px] border border-[var(--lobb-border)] px-3 py-2 text-xs font-black text-[var(--lobb-muted)]">Open</span>
    </Link>
  );
}

function RevenueRow({ value, label, strong }: { value: string; label: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--lobb-border)] pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-bold text-[var(--lobb-muted)]">{label}</p>
      <p className={`shrink-0 text-sm font-black ${strong ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-black)]"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "completed"
      ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
      : status === "confirmed"
        ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]"
        : status === "cancelled"
          ? "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"
          : status === "disputed"
            ? "bg-[var(--lobb-warning)]/14 text-[var(--lobb-warning)]"
            : "bg-[var(--lobb-bg)] text-[var(--lobb-muted)]";

  return <span className={`inline-flex rounded-[8px] px-2 py-1 text-[11px] font-black capitalize ${className}`}>{status}</span>;
}

function EmptyPanel({ title, body, compact }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`rounded-[12px] border border-dashed border-[var(--lobb-border)] bg-[var(--lobb-bg)] ${compact ? "p-4" : "p-6"}`}>
      <AlertTriangle className="size-4 text-[var(--lobb-muted)]" />
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">{body}</p>
    </div>
  );
}
