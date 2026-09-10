"use client";

import { Input as LobbInput } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  useAdminResource,
} from "@/features/admin/admin-shell";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { formatDate, money } from "@/lib/dashboard-client-types";

type PlayerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  referred_by_coach_id: string | null;
  stats: { bookings: number; completed: number; spend: number; last: string | null };
};

export default function AdminPlayersPage() {
  const { data, loading, refreshing, reload } = useAdminResource<{ players: PlayerRow[] }>("/api/admin/players");
  const players = useMemo(() => data?.players ?? [], [data]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      [p.full_name, p.email, p.phone_number].some((field) => field?.toLowerCase().includes(q))
    );
  }, [players, query]);

  const totalSpend = filtered.reduce((sum, p) => sum + p.stats.spend, 0);

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Directory"
        title="Players"
        backHref="/admin"
      >
        <AdminRefreshButton onClick={() => reload("refresh")} busy={loading || refreshing} />
      </AdminPageHeader>

      <div className="mx-auto max-w-4xl">
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard label="Players" value={String(players.length)} />
          <AdminMetricCard label="With bookings" value={String(players.filter((p) => p.stats.bookings > 0).length)} />
          <AdminMetricCard label="Lifetime booking value" value={money(totalSpend)} />
        </section>

        <div className="mt-6 flex items-center gap-2.5 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4">
          <Search className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
          <LobbInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="h-12 w-full border-0 bg-transparent text-[14px] font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
          />
        </div>

        <section className="mt-5 space-y-3">
          {loading ? (
            <>
              <SkeletonBlock className="h-20 rounded-[var(--lobb-radius-lg)]" />
              <SkeletonBlock className="h-20 rounded-[var(--lobb-radius-lg)]" />
              <SkeletonBlock className="h-20 rounded-[var(--lobb-radius-lg)]" />
            </>
          ) : filtered.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title={query ? "No players match that search" : "No players yet"}
            />
          ) : (
            filtered.map((player) => (
              <article
                key={player.id}
                className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">
                    {player.full_name ?? <span className="text-[var(--lobb-text-tertiary)]">Onboarding incomplete</span>}
                    {player.referred_by_coach_id && (
                      <span className="ml-2 rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-clay)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--lobb-clay)]">
                        Referred
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-[var(--lobb-text-secondary)]">
                    {player.email ?? "no email"}{player.phone_number ? ` · ${player.phone_number}` : ""} · joined {formatDate(player.created_at)}
                  </p>
                </div>
                <div className="mt-3 flex shrink-0 items-center gap-4 sm:mt-0">
                  <Stat label="Bookings" value={`${player.stats.completed}/${player.stats.bookings}`} />
                  <Stat label="Spend" value={money(player.stats.spend)} />
                  <Stat label="Last session" value={formatDate(player.stats.last)} />
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[13px] font-medium">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lobb-text-tertiary)]">{label}</p>
    </div>
  );
}
