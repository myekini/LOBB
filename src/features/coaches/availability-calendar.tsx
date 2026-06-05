"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import type { AvailableSlot } from "@/lib/types";

type DayGroup = {
  dateStr: string;   // "YYYY-MM-DD"
  label: string;     // "Mon 19 May"
  slots: string[];   // ["7:00 AM", "8:00 AM", …]
};

function groupByDay(slots: AvailableSlot[]): DayGroup[] {
  const map = new Map<string, string[]>();

  for (const s of slots) {
    const d = new Date(s.slot_starts_at);
    const dateKey = d.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    const timeLabel = d.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const arr = map.get(dateKey) ?? [];
    arr.push(timeLabel);
    map.set(dateKey, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, times]) => ({
      dateStr,
      label: new Date(dateStr + "T00:00:00").toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      slots: times,
    }));
}

export function AvailabilityCalendar({ slug }: { slug: string }) {
  const [groups,  setGroups]  = useState<DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/coaches/${slug}/slots`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json() as { slots: AvailableSlot[] };
        if (!cancelled) setGroups(groupByDay(json.slots));
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-4 w-48" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <SkeletonBlock className="h-4 w-28" />
            <div className="mt-3 flex flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-20 rounded-full" />
              <SkeletonBlock className="h-8 w-20 rounded-full" />
              <SkeletonBlock className="h-8 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <LobbEmptyState
        title="Couldn't load slots"
        body="Please try again later."
      />
    );
  }

  if (groups.length === 0) {
    return (
      <LobbEmptyState
        title="No open slots in the next 14 days"
        body="This coach hasn't set availability yet, or all slots are taken. Try messaging them directly."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">
        <CalendarDays className="size-4" />
        Next 14 days, 60-min sessions
      </div>

      {groups.map((group) => (
        <div
          key={group.dateStr}
          className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(58,43,20,0.05)]"
        >
          <p className="mb-3 text-sm font-black">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.slots.map((time) => (
              <span
                key={time}
                className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-bg)] px-3 py-1.5 text-xs font-bold"
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
