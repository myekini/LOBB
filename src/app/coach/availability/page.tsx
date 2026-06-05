"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck2, CalendarX2, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from "lucide-react";
import type { CoachAvailabilityRow, CoachAvailabilityBlock } from "@/lib/types";
import { InlineActionLoader, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { LobbErrorBanner } from "@/components/common/lobb-error";
import { appError, type AppErrorPayload } from "@/lib/app-errors";
import { readApiError, toastAppError, toastAppSuccess } from "@/lib/client-errors";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GRID_START = 6 * 60;
const GRID_END   = 22 * 60;
const GRID_STEP  = 30;
const TIME_OPTIONS = Array.from(
  { length: (GRID_END - GRID_START) / GRID_STEP + 1 },
  (_, i) => GRID_START + i * GRID_STEP,
);

type Window = { id: string; dow: number; start: string; end: string };

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function minutesOf(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  const v = Math.max(0, Math.min(23 * 60, m));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

function timeLabel(t: string) {
  const [h, min] = t.split(":").map(Number);
  return new Date(2026, 0, 1, h, min).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

function buildCalendar(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, value: toDateStr(date), inMonth: date.getMonth() === month.getMonth() };
  });
}

function hasOverlap(windows: Window[]) {
  for (let dow = 0; dow <= 6; dow++) {
    const day = windows
      .filter((w) => w.dow === dow)
      .sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < day.length; i++) {
      if (minutesOf(day[i].start) < minutesOf(day[i - 1].end)) return DAY_NAMES[dow];
    }
  }
  return null;
}

function windowsFromRows(rows: CoachAvailabilityRow[]): Window[] {
  return rows
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      id: r.id,
      dow: r.day_of_week,
      start: r.starts_at.slice(0, 5),
      end: r.ends_at.slice(0, 5),
    }));
}

export default function CoachAvailabilityPage() {
  const router = useRouter();

  const [windows, setWindows]           = useState<Window[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [month, setMonth]               = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [dirty,   setDirty]   = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<AppErrorPayload | null>(null);

  // Quick-apply state
  const [selectedDows, setSelectedDows] = useState<number[]>([1, 2, 3, 4, 5]);
  const [quickStart, setQuickStart]     = useState("09:00");
  const [quickEnd,   setQuickEnd]       = useState("17:00");

  const mark = () => { setDirty(true); setSaved(false); };

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coaches/me/availability");
      if (!res.ok) throw await readApiError(res, "AVAILABILITY_LOAD_FAILED");
      const json = (await res.json()) as {
        slots: CoachAvailabilityRow[];
        blocks: CoachAvailabilityBlock[];
      };
      setWindows(windowsFromRows(json.slots));
      setBlockedDates((json.blocks ?? []).map((b) => b.blocked_date));
    } catch (err) {
      setError(toastAppError(err, "AVAILABILITY_LOAD_FAILED"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Window actions ───────────────────────────────────────────────────────────

  const applyQuick = () => {
    if (!selectedDows.length || quickStart >= quickEnd) return;
    setWindows((prev) => [
      ...prev.filter((w) => !selectedDows.includes(w.dow)),
      ...selectedDows.map((dow) => ({
        id: `local-${dow}-${Date.now()}`,
        dow,
        start: quickStart,
        end: quickEnd,
      })),
    ].sort((a, b) => a.dow - b.dow || a.start.localeCompare(b.start)));
    mark();
  };

  const addWindow = (dow: number) => {
    const existing = windows
      .filter((w) => w.dow === dow)
      .sort((a, b) => a.start.localeCompare(b.start));
    const last  = existing.at(-1);
    const start = last ? minutesToTime(minutesOf(last.end) + 60) : "09:00";
    const end   = last ? minutesToTime(minutesOf(start) + 60)   : "17:00";
    if (minutesOf(start) >= GRID_END) return;
    setWindows((prev) => [
      ...prev,
      { id: `local-add-${dow}-${Date.now()}`, dow, start, end },
    ]);
    mark();
  };

  const updateWindow = (id: string, patch: Partial<Pick<Window, "start" | "end">>) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    mark();
  };

  const removeWindow = (id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    mark();
  };

  // ── Date blocking ─────────────────────────────────────────────────────────────

  const today = toDateStr(new Date());

  const toggleDate = (value: string) => {
    if (value < today) return;
    setBlockedDates((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value].sort(),
    );
    mark();
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const save = async () => {
    for (const w of windows) {
      if (w.start >= w.end) {
        setError(appError("AVAILABILITY_INVALID_HOURS", {
          message: `${DAY_NAMES[w.dow]}: end time must be after start time.`,
        }));
        return;
      }
    }
    const overlap = hasOverlap(windows);
    if (overlap) {
      setError(appError("AVAILABILITY_OVERLAP", {
        message: `${overlap}: availability windows cannot overlap.`,
      }));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coaches/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: windows.map((w) => ({
            day_of_week: w.dow,
            starts_at:   `${w.start}:00`,
            ends_at:     `${w.end}:00`,
          })),
          blocked_dates: blockedDates,
          blocked_slots: [],
        }),
      });
      if (!res.ok) throw await readApiError(res, "AVAILABILITY_SAVE_FAILED");
      setSaved(true);
      setDirty(false);
      toastAppSuccess("Availability saved");
    } catch (err) {
      setError(toastAppError(err, "AVAILABILITY_SAVE_FAILED"));
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const calendarCells   = useMemo(() => buildCalendar(month), [month]);
  const upcomingClosed  = blockedDates.filter((d) => d >= today);
  const activeDays = new Set(windows.map((window) => window.dow)).size;
  const weeklyWindowCount = windows.length;

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader title="Availability" eyebrow="Bookable slots" active="bookings" className="hidden md:block" />

      {/* Mobile header */}
      <header className="lobb-app-header sticky top-0 z-40 border-b border-[var(--lobb-border-subtle)] px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-black">Availability</span>
            {dirty && <span className="size-2 rounded-full bg-[var(--lobb-clay)]" />}
          </div>
          <div className="size-11" />
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 pb-6 sm:px-6">
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SkeletonBlock className="h-56" />
            <SkeletonBlock className="h-80" />
          </div>
        ) : (
          <>
            <section className="mb-5 grid gap-3 sm:grid-cols-3">
              <AvailabilityMetric icon={CalendarCheck2} value={String(activeDays)} label="Active days" />
              <AvailabilityMetric icon={Clock3} value={String(weeklyWindowCount)} label="Weekly windows" />
              <AvailabilityMetric icon={CalendarX2} value={String(upcomingClosed.length)} label="Closed dates" />
            </section>

            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              {/* ── Section 1: Weekly hours ───────────────────────────────── */}
              <WeeklyHoursSection
                addWindow={addWindow}
                applyQuick={applyQuick}
                quickEnd={quickEnd}
                quickStart={quickStart}
                removeWindow={removeWindow}
                selectedDows={selectedDows}
                setQuickEnd={setQuickEnd}
                setQuickStart={setQuickStart}
                setSelectedDows={setSelectedDows}
                updateWindow={updateWindow}
                windows={windows}
              />

              {/* ── Section 2: Days off ───────────────────────────────────── */}
              <DaysOffSection
                blockedDates={blockedDates}
                calendarCells={calendarCells}
                month={month}
                setMonth={setMonth}
                today={today}
                toggleDate={toggleDate}
                upcomingClosed={upcomingClosed}
                windows={windows}
              />
            </div>

            <LobbErrorBanner
              error={error}
              fallbackCode="AVAILABILITY_SAVE_FAILED"
              actionLabel={error?.code === "AVAILABILITY_LOAD_FAILED" ? "Try again" : undefined}
              onAction={error?.code === "AVAILABILITY_LOAD_FAILED" ? load : undefined}
            />
          </>
        )}
      </section>

      {/* Save footer */}
      <footer className="lobb-app-header fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border-subtle)] p-3 shadow-[var(--lobb-shadow-sheet)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className={`hidden shrink-0 text-[11px] font-bold sm:block ${dirty ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-success)]"}`}>
            {dirty ? "● Unsaved changes" : saved ? "✓ Saved" : ""}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--lobb-text-secondary)] sm:hidden">
            {dirty ? "Unsaved changes" : saved ? "Saved" : "Availability"}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={loading || saving || !dirty}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] disabled:opacity-40 sm:flex-none sm:px-9"
          >
            {saving ? <InlineActionLoader label="Saving" /> : saved && !dirty ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </footer>
    </main>
  );
}

function AvailabilityMetric({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="lobb-app-card flex items-center gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xl font-black leading-none">{value}</p>
        <p className="mt-1 text-xs font-bold text-[var(--lobb-text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

function WeeklyHoursSection({
  addWindow, applyQuick, quickEnd, quickStart, removeWindow,
  selectedDows, setQuickEnd, setQuickStart, setSelectedDows, updateWindow, windows,
}: {
  addWindow: (dow: number) => void;
  applyQuick: () => void;
  quickEnd: string;
  quickStart: string;
  removeWindow: (id: string) => void;
  selectedDows: number[];
  setQuickEnd: (v: string) => void;
  setQuickStart: (v: string) => void;
  setSelectedDows: (dows: number[]) => void;
  updateWindow: (id: string, patch: Partial<Pick<Window, "start" | "end">>) => void;
  windows: Window[];
}) {
  const toggleDow = (dow: number) => {
    setSelectedDows(
      selectedDows.includes(dow)
        ? selectedDows.length > 1 ? selectedDows.filter((d) => d !== dow) : selectedDows
        : [...selectedDows, dow].sort((a, b) => a - b),
    );
  };

  const presets: Array<[string, number[]]> = [
    ["Mon–Fri", [1, 2, 3, 4, 5]],
    ["Weekend", [0, 6]],
    ["Every day", [0, 1, 2, 3, 4, 5, 6]],
  ];

  return (
    <section className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Weekly hours</p>
      <h2 className="mt-1 text-xl font-black">When do you coach?</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
        These hours repeat every week. Players see open 60-minute slots up to 14 days ahead.
      </p>

      {/* Quick apply */}
      <div className="lobb-app-panel mt-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4">
        <p className="mb-3 text-xs font-black text-[var(--lobb-text-secondary)]">
          Apply hours to selected days
        </p>

        {/* Day toggles */}
        <div className="grid grid-cols-7 gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
            const on = selectedDows.includes(dow);
            return (
              <button
                key={dow}
                type="button"
                onClick={() => toggleDow(dow)}
                aria-pressed={on}
                aria-label={`${on ? "Remove" : "Add"} ${DAY_NAMES[dow]}`}
                className={`flex flex-col items-center gap-1 rounded-[12px] border py-2.5 text-xs transition-all ${
                  on
                    ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                    : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/40"
                }`}
              >
                <span className="text-[10px] font-black uppercase">{DAY_SHORT[dow]}</span>
              </button>
            );
          })}
        </div>

        {/* Preset shortcuts */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map(([label, dows]) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDows([...dows])}
              aria-pressed={selectedDows.length === dows.length && dows.every((dow) => selectedDows.includes(dow))}
              className="rounded-full border border-[var(--lobb-border-subtle)] px-3 py-1 text-[11px] font-black text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-text-primary)]"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Time range + apply */}
        <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <TimeSelect label="From" value={quickStart} onChange={setQuickStart} />
          <TimeSelect label="Until" value={quickEnd} onChange={setQuickEnd} />
          <button
            type="button"
            disabled={!selectedDows.length || quickStart >= quickEnd}
            onClick={applyQuick}
            className="col-span-2 h-10 rounded-[12px] bg-[var(--lobb-bg-inverse)] px-5 text-xs font-black text-[var(--lobb-text-inverse)] disabled:opacity-40 sm:col-span-1"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Per-day schedule */}
      <div className="mt-4 space-y-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
          const dayWindows = windows
            .filter((w) => w.dow === dow)
            .sort((a, b) => a.start.localeCompare(b.start));
          const isOpen = dayWindows.length > 0;
          return (
            <div
              key={dow}
              className="rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]"
            >
              <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-black">{DAY_NAMES[dow]}</span>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  {isOpen ? (
                    <span className="min-w-0 truncate text-xs font-semibold text-[var(--lobb-success)]">
                      {dayWindows.map((w) => `${timeLabel(w.start)}–${timeLabel(w.end)}`).join(", ")}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[var(--lobb-text-tertiary)]">Closed</span>
                  )}
                  <button
                    type="button"
                    onClick={() => addWindow(dow)}
                    aria-label={`Add hours for ${DAY_NAMES[dow]}`}
                    className="flex size-7 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/40 hover:text-[var(--lobb-clay)]"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="space-y-2 border-t border-[var(--lobb-border-subtle)] px-3 py-2.5">
                  {dayWindows.map((w) => (
                    <div key={w.id} className="grid grid-cols-[1fr_1fr_32px] items-end gap-2">
                      <TimeSelect
                        label="From"
                        value={w.start}
                        onChange={(v) => updateWindow(w.id, { start: v })}
                      />
                      <TimeSelect
                        label="Until"
                        value={w.end}
                        onChange={(v) => updateWindow(w.id, { end: v })}
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(w.id)}
                        aria-label="Remove"
                        className="flex size-8 items-center justify-center rounded-[10px] border border-[var(--lobb-border-subtle)] text-[var(--lobb-error)] hover:bg-[var(--lobb-error)]/5"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DaysOffSection({
  blockedDates, calendarCells, month, setMonth, today, toggleDate, upcomingClosed, windows,
}: {
  blockedDates: string[];
  calendarCells: { date: Date; value: string; inMonth: boolean }[];
  month: Date;
  setMonth: (m: Date) => void;
  today: string;
  toggleDate: (value: string) => void;
  upcomingClosed: string[];
  windows: Window[];
}) {
  return (
    <section className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Days off</p>
      <h2 className="mt-1 text-xl font-black">Close specific dates</h2>
      <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
        Tap any date to close it. Weekly hours still apply to every other date.
        A{" "}
        <span className="inline-block size-1.5 rounded-full bg-[var(--lobb-success)] align-middle" />
        {" "}green dot means you have hours set for that weekday.
      </p>

      {/* Month navigation */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Previous month"
          className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-black">{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Next month"
          className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <span key={d} className="py-1 text-[10px] font-black text-[var(--lobb-text-secondary)]">{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell) => {
          const isPast   = cell.value < today;
          const isClosed = blockedDates.includes(cell.value);
          const isToday  = cell.value === today;
          const hasHours = windows.some((w) => w.dow === cell.date.getDay());

          if (!cell.inMonth) {
            return <div key={cell.value} />;
          }

          return (
            <button
              key={cell.value}
              type="button"
              disabled={isPast}
              onClick={() => toggleDate(cell.value)}
              aria-pressed={isClosed}
              aria-label={`${isClosed ? "Reopen" : "Close"} ${cell.date.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}`}
              className={`relative flex h-10 w-full items-center justify-center rounded-[10px] text-sm font-black transition-all active:scale-95 ${
                isPast
                  ? "cursor-not-allowed opacity-30 text-[var(--lobb-text-tertiary)]"
                  : isClosed
                  ? "bg-[var(--lobb-error)]/12 text-[var(--lobb-error)] line-through hover:bg-[var(--lobb-error)]/20"
                  : isToday
                  ? "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)] ring-2 ring-[var(--lobb-clay)]/30 hover:bg-[var(--lobb-clay)]/20"
                  : hasHours
                  ? "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-clay-light)] hover:text-[var(--lobb-clay)]"
                  : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-tertiary)] hover:bg-[var(--lobb-bg-secondary)]"
              }`}
            >
              {cell.date.getDate()}
              {hasHours && !isClosed && !isPast && (
                <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--lobb-success)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Closed dates pills */}
      {upcomingClosed.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2.5 text-[11px] font-black uppercase tracking-wider text-[var(--lobb-text-secondary)]">
            Closed dates, tap to reopen
          </p>
          <div className="flex flex-wrap gap-2">
            {upcomingClosed.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDate(d)}
                aria-label={`Reopen ${new Date(`${d}T00:00:00`).toLocaleDateString("en-NG", {
                  weekday: "long", day: "numeric", month: "long",
                })}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-error)]/25 bg-[var(--lobb-error)]/8 px-3 py-1.5 text-xs font-black text-[var(--lobb-error)] transition-colors hover:bg-[var(--lobb-error)]/15"
              >
                {new Date(`${d}T00:00:00`).toLocaleDateString("en-NG", {
                  weekday: "short", day: "numeric", month: "short",
                })}
                <X className="size-3" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-[14px] bg-[var(--lobb-bg-primary)] px-3 py-2.5 text-xs font-semibold text-[var(--lobb-text-secondary)]">
          No dates closed. Tap any future date to close it.
        </p>
      )}
    </section>
  );
}

function TimeSelect({ label, onChange, value }: { label: string; onChange: (v: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-text-tertiary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-2 text-xs font-black text-[var(--lobb-text-primary)] outline-none transition-colors focus:border-[var(--lobb-clay)]"
      >
        {TIME_OPTIONS.map((m) => {
          const t = minutesToTime(m);
          return <option key={t} value={t}>{timeLabel(t)}</option>;
        })}
      </select>
    </label>
  );
}
