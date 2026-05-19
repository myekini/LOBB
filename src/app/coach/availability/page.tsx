"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Clock3, X } from "lucide-react";
import type { CoachAvailabilityRow, CoachAvailabilityBlock } from "@/lib/types";
import { SkeletonBlock } from "@/components/lobb-skeleton";

// 0 = Sunday … 6 = Saturday (matches JS Date.getDay / Postgres DOW)
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayRow = {
  dow: number;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
};

function buildDefaultDays(): DayRow[] {
  return DAY_NAMES.map((label, dow) => ({
    dow,
    label,
    enabled: false,
    start: "07:00",
    end: "10:00",
  }));
}

function slotsToRows(slots: CoachAvailabilityRow[]): DayRow[] {
  const rows = buildDefaultDays();
  for (const s of slots) {
    const row = rows[s.day_of_week];
    if (!row) continue;
    row.enabled = true;
    // "HH:MM:SS" → "HH:MM"
    row.start = s.starts_at.slice(0, 5);
    row.end   = s.ends_at.slice(0, 5);
  }
  return rows;
}

function formatBlockDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "2-digit", month: "long" });
}

function blockMonthDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    month: d.toLocaleDateString("en-NG", { month: "short" }).toUpperCase(),
    day:   d.toLocaleDateString("en-NG", { day: "2-digit" }),
  };
}

export default function CoachAvailabilityPage() {
  const router = useRouter();

  const [days,    setDays]    = useState<DayRow[]>(buildDefaultDays());
  const [blocks,  setBlocks]  = useState<CoachAvailabilityBlock[]>([]);
  const [newDate, setNewDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  // Load existing availability on mount
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coaches/me/availability");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json() as { slots: CoachAvailabilityRow[]; blocks: CoachAvailabilityBlock[] };
      setDays(slotsToRows(json.slots));
      setBlocks(json.blocks);
    } catch {
      setError("Could not load your availability. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateDay = (index: number, updates: Partial<DayRow>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)));
    setSaved(false);
  };

  const addBlock = () => {
    if (!newDate) return;
    if (blocks.some((b) => b.blocked_date === newDate)) {
      setNewDate("");
      return;
    }
    const stub: CoachAvailabilityBlock = {
      id: `local-${Date.now()}`,
      coach_id: "",
      blocked_date: newDate,
      reason: null,
      created_at: new Date().toISOString(),
    };
    setBlocks((prev) => [...prev, stub].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)));
    setNewDate("");
    setSaved(false);
  };

  const removeBlock = (dateStr: string) => {
    setBlocks((prev) => prev.filter((b) => b.blocked_date !== dateStr));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    const slots = days
      .filter((d) => d.enabled)
      .map((d) => ({
        day_of_week: d.dow,
        starts_at:   d.start + ":00",
        ends_at:     d.end   + ":00",
      }));

    // Validate: end must be after start
    for (const s of slots) {
      if (s.starts_at >= s.ends_at) {
        setSaving(false);
        setError(`${DAY_NAMES[s.day_of_week]}: end time must be after start time.`);
        return;
      }
    }

    const body = {
      slots,
      blocked_dates: blocks.map((b) => b.blocked_date),
    };

    try {
      const res = await fetch("/api/coaches/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? "Save failed");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Min date for the date picker: tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-32 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black">My Availability</h1>
        </header>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
                <SkeletonBlock className="h-5 w-32" />
                <SkeletonBlock className="mt-4 h-12 w-full rounded-[14px]" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {saved && (
              <p className="mb-5 rounded-[18px] bg-[#e8f4ed] px-4 py-3 text-sm font-black text-[var(--lobb-success)]">
                Availability saved successfully.
              </p>
            )}
            {error && (
              <p className="mb-5 rounded-[18px] bg-[#fff0e8] px-4 py-3 text-sm font-black text-[var(--lobb-clay-dark)]">
                {error}
              </p>
            )}

            {/* ── Weekly schedule ─────────────────────────────────────── */}
            <section>
              <h2 className="font-black">Weekly Schedule</h2>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Set when you&apos;re available each week. Players can book 60-minute slots within
                these windows.
              </p>

              <div className="mt-4 space-y-3">
                {days.map((item, index) => (
                  <article
                    key={item.dow}
                    className={`rounded-[20px] border bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)] ${
                      item.enabled ? "border-[var(--lobb-clay)]" : "border-[var(--lobb-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black">{item.label}</p>
                      <button
                        type="button"
                        onClick={() => updateDay(index, { enabled: !item.enabled })}
                        className={`relative h-7 w-12 rounded-full transition ${
                          item.enabled ? "bg-[var(--lobb-black)]" : "bg-[var(--lobb-surface-2)]"
                        }`}
                        aria-label={`Toggle ${item.label}`}
                      >
                        <span
                          className={`absolute top-1 size-5 rounded-full bg-white transition-all ${
                            item.enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {item.enabled ? (
                      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <TimeInput
                          value={item.start}
                          onChange={(v) => updateDay(index, { start: v })}
                        />
                        <span className="text-xs font-black text-[var(--lobb-muted)]">to</span>
                        <TimeInput
                          value={item.end}
                          onChange={(v) => updateDay(index, { end: v })}
                        />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm font-semibold italic text-[var(--lobb-muted)]">
                        Closed
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>

            {/* ── Block specific dates ─────────────────────────────────── */}
            <section className="mt-9">
              <h2 className="font-black">Block Specific Dates</h2>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Mark days you can&apos;t coach — holidays, travel, etc.
              </p>

              <div className="mt-4 flex gap-2">
                <label className="flex h-12 flex-1 items-center gap-2 rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3">
                  <CalendarPlus className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                  <input
                    type="date"
                    value={newDate}
                    min={minDateStr}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={addBlock}
                  disabled={!newDate}
                  className="h-12 rounded-[14px] bg-[var(--lobb-black)] px-5 text-sm font-black text-white disabled:opacity-40"
                >
                  Block
                </button>
              </div>

              {blocks.length > 0 && (
                <>
                  <h3 className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
                    Blocked dates
                  </h3>
                  <div className="mt-3 space-y-3">
                    {blocks.map((b) => {
                      const { month, day } = blockMonthDay(b.blocked_date);
                      return (
                        <article
                          key={b.blocked_date}
                          className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--lobb-border)] border-l-4 border-l-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-[12px] bg-white px-3 py-2 text-center">
                              <p className="text-[10px] font-black uppercase text-[var(--lobb-clay)]">
                                {month}
                              </p>
                              <p className="text-lg font-black">{day}</p>
                            </div>
                            <p className="text-sm font-black">{formatBlockDate(b.blocked_date)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeBlock(b.blocked_date)}
                            className="flex size-9 items-center justify-center rounded-full text-[var(--lobb-muted)] hover:text-[var(--lobb-black)]"
                            aria-label="Remove blocked date"
                          >
                            <X className="size-4" />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Availability"}
          </button>
        </div>
      </footer>
    </main>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-[14px] border border-[var(--lobb-border)] bg-white px-3">
      <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black outline-none"
      />
    </label>
  );
}
