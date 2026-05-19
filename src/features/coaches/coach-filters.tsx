"use client";

import { Search } from "lucide-react";

export function CoachFilters({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4">
      <Search className="size-4 text-[var(--lobb-muted)]" />
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search coaches" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
    </label>
  );
}
