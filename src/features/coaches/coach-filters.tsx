"use client";

import { Input as LobbInput } from "@/components/ui/input";
import { Search } from "lucide-react";

export function CoachFilters({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4">
      <Search className="size-4 text-[var(--lobb-text-secondary)]" />
      <LobbInput value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search coaches" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
    </label>
  );
}
