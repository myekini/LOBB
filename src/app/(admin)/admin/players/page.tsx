"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminRefreshButton,
  AdminShell,
  useAdminResource,
} from "@/features/admin/admin-shell";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonCell } from "@/components/common/person-cell";
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
      <AdminPageHeader eyebrow="Directory" title="Players" backHref="/admin">
        <AdminRefreshButton onClick={() => reload("refresh")} busy={loading || refreshing} />
      </AdminPageHeader>

      <div className="mx-auto max-w-5xl">
        <section className="grid gap-3 sm:grid-cols-3">
          <AdminMetricCard label="Players" value={String(players.length)} />
          <AdminMetricCard label="With bookings" value={String(players.filter((p) => p.stats.bookings > 0).length)} />
          <AdminMetricCard label="Lifetime booking value" value={money(totalSpend)} />
        </section>

        <div className="mt-6">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
          />
        </div>

        <section className="mt-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-14 rounded-[var(--lobb-radius-md)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <AdminEmptyState icon={Users} title={query ? "No players match that search" : "No players yet"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Last session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <PersonCell
                        name={player.full_name}
                        trailing={
                          player.referred_by_coach_id ? (
                            <span className="rounded-[var(--lobb-radius-sm)] bg-[var(--lobb-clay)]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--lobb-clay)]">
                              Referred
                            </span>
                          ) : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {player.email ?? "no email"}
                      {player.phone_number ? <span className="block">{player.phone_number}</span> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {formatDate(player.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      {player.stats.completed}/{player.stats.bookings}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                      {money(player.stats.spend)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {formatDate(player.stats.last)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
