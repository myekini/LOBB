"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/features/admin/admin-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";

type PlayerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  referred_by_coach_id: string | null;
  stats: { bookings: number; completed: number; spend: number; last: string | null };
};

function money(value: number) {
  return `₦${(value ?? 0).toLocaleString("en-NG")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/players")
      .then((r) => r.json() as Promise<{ players?: PlayerRow[]; error?: string }>)
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setPlayers(json.players ?? []);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load players" });
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      [p.full_name, p.email, p.phone_number].some((field) => field?.toLowerCase().includes(q))
    );
  }, [players, query]);

  const totalSpend = filtered.reduce((sum, p) => sum + p.stats.spend, 0);

  return (
    <AdminShell active="Players">
      <AdminBackHeader title="Players" />

      <div className="mx-auto max-w-4xl">
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Players" value={String(players.length)} />
          <Metric label="With bookings" value={String(players.filter((p) => p.stats.bookings > 0).length)} />
          <Metric label="Lifetime booking value" value={money(totalSpend)} />
        </section>

        <div className="mt-6 flex items-center gap-2.5 rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4">
          <Search className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="h-12 w-full border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
          />
        </div>

        <section className="mt-5 space-y-3">
          {loading ? (
            <>
              <SkeletonBlock className="h-20 rounded-[16px]" />
              <SkeletonBlock className="h-20 rounded-[16px]" />
              <SkeletonBlock className="h-20 rounded-[16px]" />
            </>
          ) : filtered.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center">
              <Users className="mx-auto size-6 text-[var(--lobb-text-tertiary)]" />
              <p className="mt-3 text-sm font-black">{query ? "No players match that search" : "No players yet"}</p>
            </div>
          ) : (
            filtered.map((player) => (
              <article
                key={player.id}
                className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black">
                    {player.full_name ?? <span className="text-[var(--lobb-text-tertiary)]">Onboarding incomplete</span>}
                    {player.referred_by_coach_id && (
                      <span className="ml-2 rounded-full bg-[var(--lobb-clay)]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--lobb-clay)]">
                        Referred
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[var(--lobb-muted)]">
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
      <p className="text-xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--lobb-text-secondary)]">{label}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[13px] font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lobb-text-tertiary)]">{label}</p>
    </div>
  );
}
