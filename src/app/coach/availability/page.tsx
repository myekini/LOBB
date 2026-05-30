"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { CoachAvailabilityBlock, CoachAvailabilityRow, CoachAvailabilitySlotBlock } from "@/lib/types";
import { InlineActionLoader, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { showLobbToast } from "@/providers/lobb-global-state";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Availability can be set between 6 AM and 10 PM in 30-minute increments.
const GRID_START = 6 * 60;
const GRID_END = 22 * 60;
const GRID_STEP = 30;
const TIME_OPTIONS = Array.from(
  { length: (GRID_END - GRID_START) / GRID_STEP + 1 },
  (_, i) => GRID_START + i * GRID_STEP
);

type WeeklyWindow = {
  id: string;
  dow: number;
  start: string;
  end: string;
};

type CalendarCell = {
  date: Date;
  value: string;
  inMonth: boolean;
};

type BookingSlotBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  player_name: string | null;
};

function windowsFromRows(rows: CoachAvailabilityRow[]): WeeklyWindow[] {
  return rows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      id: row.id,
      dow: row.day_of_week,
      start: row.starts_at.slice(0, 5),
      end: row.ends_at.slice(0, 5),
    }));
}

function dateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateValue(value: string) {
  return new Date(`${value}T00:00:00`);
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeFromMinutes(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60, value));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function timeLabel(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
}

function selectedDateLabel(value: string) {
  return fromDateValue(value).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" });
}

function shortDateLabel(value: string) {
  return fromDateValue(value).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

function buildCalendar(month: Date): CalendarCell[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, value: dateValue(date), inMonth: date.getMonth() === month.getMonth() };
  });
}

function weekFor(value: string) {
  const selected = fromDateValue(value);
  const start = new Date(selected);
  start.setDate(selected.getDate() - selected.getDay());
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date, value: dateValue(date) };
  });
}

function windowsForDow(wins: WeeklyWindow[], dow: number) {
  return wins.filter((w) => w.dow === dow).sort((a, b) => a.start.localeCompare(b.start));
}

function windowsSummary(wins: WeeklyWindow[], dow: number) {
  const dayWindows = windowsForDow(wins, dow);
  if (!dayWindows.length) return `${DAY_SHORT[dow]}: Closed`;
  return `${DAY_SHORT[dow]}: ${dayWindows.map((window) => `${timeLabel(window.start)} - ${timeLabel(window.end)}`).join(", ")}`;
}

function slotsForDate(dateString: string, wins: WeeklyWindow[]) {
  const dow = fromDateValue(dateString).getDay();
  const dayWindows = windowsForDow(wins, dow);
  const slots: Array<{ starts_at: string; ends_at: string; label: string; shortLabel: string; windowId: string }> = [];
  for (const window of dayWindows) {
    for (let current = minutes(window.start); current + 60 <= minutes(window.end); current += 60) {
      const start = timeFromMinutes(current);
      const end = timeFromMinutes(current + 60);
      slots.push({
        starts_at: new Date(`${dateString}T${start}:00+01:00`).toISOString(),
        ends_at: new Date(`${dateString}T${end}:00+01:00`).toISOString(),
        label: `${timeLabel(start)} - ${timeLabel(end)}`,
        shortLabel: timeLabel(start),
        windowId: window.id,
      });
    }
  }
  return slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

function hasOverlaps(wins: WeeklyWindow[]) {
  for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
    const dayWindows = windowsForDow(wins, dow);
    for (let index = 1; index < dayWindows.length; index += 1) {
      if (minutes(dayWindows[index].start) < minutes(dayWindows[index - 1].end)) return DAY_NAMES[dow];
    }
  }
  return null;
}

function createWindow(dow: number, existing: WeeklyWindow[]): WeeklyWindow {
  const latest = windowsForDow(existing, dow).at(-1);
  const start = latest ? timeFromMinutes(minutes(latest.end) + 60) : "09:00";
  const end = latest ? timeFromMinutes(minutes(start) + 60) : "17:00";
  return { id: `local-${dow}-${Date.now()}`, dow, start, end };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CoachAvailabilityPage() {
  const router = useRouter();
  const [windows, setWindows] = useState<WeeklyWindow[]>([]);
  const [blocks, setBlocks] = useState<CoachAvailabilityBlock[]>([]);
  const [slotBlocks, setSlotBlocks] = useState<CoachAvailabilitySlotBlock[]>([]);
  const [bookingBlocks, setBookingBlocks] = useState<BookingSlotBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateValue(new Date()));
  const [selectedDates, setSelectedDates] = useState<string[]>(() => [dateValue(new Date())]);
  const [selectedDows, setSelectedDows] = useState<number[]>([1, 2, 3, 4, 5]);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<"month" | "grid">("grid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coaches/me/availability");
      if (!response.ok) throw new Error("Failed to load availability");
      const json = (await response.json()) as {
        slots: CoachAvailabilityRow[];
        blocks: CoachAvailabilityBlock[];
        slot_blocks?: CoachAvailabilitySlotBlock[];
        booking_blocks?: BookingSlotBlock[];
      };
      setWindows(windowsFromRows(json.slots));
      setBlocks(json.blocks);
      setSlotBlocks(
        (json.slot_blocks ?? []).map((sb) => ({
          ...sb,
          slot_starts_at: new Date(sb.slot_starts_at).toISOString(),
          slot_ends_at: new Date(sb.slot_ends_at).toISOString(),
        }))
      );
      setBookingBlocks(
        (json.booking_blocks ?? []).map((booking) => ({
          ...booking,
          starts_at: new Date(booking.starts_at).toISOString(),
          ends_at: new Date(booking.ends_at).toISOString(),
        }))
      );
    } catch {
      setError("Could not load your availability. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedDow = fromDateValue(selectedDate).getDay();
  const selectedWindows = windowsForDow(windows, selectedDow);
  const selectedBlocked = blocks.some((block) => block.blocked_date === selectedDate);
  const selectedSlots = selectedBlocked ? [] : slotsForDate(selectedDate, windows);
  const selectedSlotBlocks = slotBlocks.filter((slot) => dateValue(new Date(slot.slot_starts_at)) === selectedDate);
  const selectedBookingBlocks = bookingBlocks.filter((slot) => dateValue(new Date(slot.starts_at)) === selectedDate);
  const calendarCells = useMemo(() => buildCalendar(month), [month]);
  const weekCells = useMemo(() => weekFor(selectedDate), [selectedDate]);

  const markDirty = () => { setSaved(false); setDirty(true); };

  const setFullDayBlocked = (dateString: string, blocked: boolean) => {
    setBlocks((prev) => {
      const exists = prev.some((block) => block.blocked_date === dateString);
      if (blocked && exists) return prev;
      if (!blocked) return prev.filter((block) => block.blocked_date !== dateString);
      return [...prev, { id: `local-${Date.now()}`, coach_id: "", blocked_date: dateString, reason: null, created_at: new Date().toISOString() }]
        .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date));
    });
    markDirty();
  };

  const setFullDatesBlocked = (dateStrings: string[], blocked: boolean) => {
    const uniqueDates = Array.from(new Set(dateStrings));
    setBlocks((prev) => {
      if (!blocked) return prev.filter((block) => !uniqueDates.includes(block.blocked_date));
      const existing = new Set(prev.map((block) => block.blocked_date));
      const additions = uniqueDates
        .filter((dateString) => !existing.has(dateString))
        .map((dateString) => ({
          id: `local-${dateString}-${Date.now()}`,
          coach_id: "",
          blocked_date: dateString,
          reason: null,
          created_at: new Date().toISOString(),
        }));
      return [...prev, ...additions].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date));
    });
    markDirty();
  };

  const toggleCalendarDate = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedDates((prev) => {
      if (!prev.includes(dateString)) return [...prev, dateString].sort();
      if (prev.length === 1) return prev;
      const next = prev.filter((item) => item !== dateString);
      setSelectedDate(next[0] ?? dateString);
      return next;
    });
  };

  const toggleSelectedDow = (dow: number) => {
    setSelectedDows((prev) => {
      if (prev.includes(dow)) return prev.length === 1 ? prev : prev.filter((item) => item !== dow);
      return [...prev, dow].sort((a, b) => a - b);
    });
  };

  const setWeeklyHoursForDows = (dows: number[], start: string, end: string) => {
    const targets = Array.from(new Set(dows));
    setWindows((prev) => [
      ...prev.filter((window) => !targets.includes(window.dow)),
      ...targets.map((dow) => ({
        id: `local-quick-${dow}-${Date.now()}`,
        dow,
        start,
        end,
      })),
    ].sort((a, b) => a.dow - b.dow || a.start.localeCompare(b.start)));
    markDirty();
  };

  const closeWeeklyDows = (dows: number[]) => {
    const targets = Array.from(new Set(dows));
    setWindows((prev) => prev.filter((window) => !targets.includes(window.dow)));
    markDirty();
  };

  const addWindow = (dow = selectedDow) => {
    setWindows((prev) => [...prev, createWindow(dow, prev)]);
    setFullDayBlocked(selectedDate, false);
    markDirty();
  };

  const updateWindow = (id: string, patch: Partial<Pick<WeeklyWindow, "start" | "end">>) => {
    setWindows((prev) =>
      prev.map((window) => (window.id === id ? { ...window, ...patch } : window))
    );
    markDirty();
  };

  const removeWindow = (id: string) => {
    setWindows((prev) => prev.filter((window) => window.id !== id));
    markDirty();
  };

  const toggleSlotBlock = (slot: { starts_at: string; ends_at: string }) => {
    if (bookingBlocks.some((booking) => booking.starts_at === slot.starts_at)) {
      showLobbToast({ type: "info", message: "Booked and payment-pending slots cannot be manually unblocked here." });
      return;
    }
    setSlotBlocks((prev) => {
      const exists = prev.some((item) => item.slot_starts_at === slot.starts_at);
      if (exists) return prev.filter((item) => item.slot_starts_at !== slot.starts_at);
      return [
        ...prev,
        {
          id: `local-slot-${Date.now()}`,
          coach_id: "",
          slot_starts_at: slot.starts_at,
          slot_ends_at: slot.ends_at,
          reason: "Blocked by coach",
          created_at: new Date().toISOString(),
        },
      ].sort((a, b) => a.slot_starts_at.localeCompare(b.slot_starts_at));
    });
    markDirty();
  };

  const copyWindows = (fromDow: number, toDows: number[]) => {
    const source = windowsForDow(windows, fromDow);
    setWindows((prev) => [
      ...prev.filter((window) => !toDows.includes(window.dow)),
      ...toDows.flatMap((dow) =>
        source.map((window, index) => ({
          ...window,
          id: `local-copy-${dow}-${Date.now()}-${index}`,
          dow,
        }))
      ),
    ].sort((a, b) => a.dow - b.dow || a.start.localeCompare(b.start)));
    markDirty();
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    for (const window of windows) {
      if (window.start >= window.end) {
        setSaving(false);
        setError(`${DAY_NAMES[window.dow]}: end time must be after start time.`);
        return;
      }
    }
    const overlapDay = hasOverlaps(windows);
    if (overlapDay) {
      setSaving(false);
      setError(`${overlapDay}: availability windows cannot overlap.`);
      return;
    }

    try {
      const response = await fetch("/api/coaches/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots: windows.map((window) => ({
            day_of_week: window.dow,
            starts_at: `${window.start}:00`,
            ends_at: `${window.end}:00`,
          })),
          blocked_dates: blocks.map((block) => block.blocked_date),
          blocked_slots: slotBlocks.map((slot) => ({
            slot_starts_at: slot.slot_starts_at,
            slot_ends_at: slot.slot_ends_at,
            reason: slot.reason,
          })),
        }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? "Save failed");
      }
      setSaved(true);
      setDirty(false);
      showLobbToast({ type: "success", message: "Availability saved" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save. Try again.";
      setError(message);
      showLobbToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader title="Availability" eyebrow="Bookable slots" active="bookings" className="hidden md:block" />

      <header className="sticky top-0 z-40 border-b border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)]/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <IconButton label="Back" onClick={() => router.back()} icon={<ArrowLeft className="size-4" />} />
          <div className="flex items-center gap-2">
            <p className="font-black">Availability</p>
            {dirty && <span className="size-2 rounded-full bg-[var(--lobb-clay)]" />}
          </div>
          <div className="size-11" />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:pt-7">
        {loading ? (
          <AvailabilityLoading />
        ) : (
          <>
            <DesktopAvailability
              blocks={blocks}
              calendarCells={calendarCells}
              month={month}
              selectedBlocked={selectedBlocked}
              selectedDate={selectedDate}
              selectedDates={selectedDates}
              selectedDows={selectedDows}
              selectedSlotBlocks={selectedSlotBlocks}
              selectedBookingBlocks={selectedBookingBlocks}
              selectedSlots={selectedSlots}
              selectedWindows={selectedWindows}
              closeWeeklyDows={closeWeeklyDows}
              setFullDayBlocked={setFullDayBlocked}
              setFullDatesBlocked={setFullDatesBlocked}
              setMonth={setMonth}
              setSelectedDate={setSelectedDate}
              setSelectedDows={setSelectedDows}
              setViewMode={setViewMode}
              slotBlocks={slotBlocks}
              toggleCalendarDate={toggleCalendarDate}
              toggleSelectedDow={toggleSelectedDow}
              bookingBlocks={bookingBlocks}
              toggleSlotBlock={toggleSlotBlock}
              viewMode={viewMode}
              windows={windows}
              addWindow={addWindow}
              updateWindow={updateWindow}
              removeWindow={removeWindow}
              copyWindows={copyWindows}
              setWeeklyHoursForDows={setWeeklyHoursForDows}
            />
            <MobileAvailability
              addWindow={addWindow}
              closeWeeklyDows={closeWeeklyDows}
              updateWindow={updateWindow}
              removeWindow={removeWindow}
              selectedBlocked={selectedBlocked}
              selectedDate={selectedDate}
              selectedDows={selectedDows}
              selectedSlotBlocks={selectedSlotBlocks}
              selectedBookingBlocks={selectedBookingBlocks}
              selectedSlots={selectedSlots}
              selectedWindows={selectedWindows}
              setFullDayBlocked={setFullDayBlocked}
              setSelectedDate={setSelectedDate}
              setSelectedDows={setSelectedDows}
              setWeeklyHoursForDows={setWeeklyHoursForDows}
              toggleSelectedDow={toggleSelectedDow}
              toggleSlotBlock={toggleSlotBlock}
              copyWindows={copyWindows}
              weekCells={weekCells}
              windows={windows}
            />
            {error && (
              <p className="mt-5 rounded-[14px] bg-[#fff0e8] px-4 py-3 text-sm font-black text-[var(--lobb-clay-dark)]">
                {error}
              </p>
            )}
          </>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]/96 p-3 shadow-[var(--lobb-shadow-sheet)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          {dirty && !saving && (
            <p className="hidden shrink-0 text-[11px] font-bold text-[var(--lobb-clay)] sm:block">
              ● Unsaved changes
            </p>
          )}
          {saved && !dirty && (
            <p className="hidden shrink-0 text-[11px] font-bold text-[var(--lobb-success)] sm:block">
              ✓ Saved
            </p>
          )}
          <button type="button" onClick={save} disabled={loading || saving || !dirty} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] disabled:opacity-40 sm:flex-none sm:px-9">
            {saving ? <InlineActionLoader label="Saving" /> : saved && !dirty ? "✓ Saved" : "Save changes"}
          </button>
        </div>
      </footer>
    </main>
  );
}

// ── Desktop layout ────────────────────────────────────────────────────────────

function DesktopAvailability(props: {
  blocks: CoachAvailabilityBlock[];
  calendarCells: CalendarCell[];
  month: Date;
  selectedBlocked: boolean;
  selectedDate: string;
  selectedDates: string[];
  selectedDows: number[];
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedBookingBlocks: BookingSlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  closeWeeklyDows: (dows: number[]) => void;
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  setFullDatesBlocked: (dateStrings: string[], blocked: boolean) => void;
  setMonth: (date: Date) => void;
  setSelectedDate: (date: string) => void;
  setSelectedDows: (dows: number[]) => void;
  setViewMode: (mode: "month" | "grid") => void;
  slotBlocks: CoachAvailabilitySlotBlock[];
  bookingBlocks: BookingSlotBlock[];
  toggleCalendarDate: (date: string) => void;
  toggleSelectedDow: (dow: number) => void;
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  viewMode: "month" | "grid";
  windows: WeeklyWindow[];
  addWindow: (dow?: number) => void;
  updateWindow: (id: string, patch: Partial<Pick<WeeklyWindow, "start" | "end">>) => void;
  removeWindow: (id: string) => void;
  copyWindows: (fromDow: number, toDows: number[]) => void;
  setWeeklyHoursForDows: (dows: number[], start: string, end: string) => void;
}) {
  const blockedDates = new Set(props.blocks.map((block) => block.blocked_date));
  return (
    <div className="hidden md:block">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Bookable slots</p>
          <h1 className="mt-2 text-[34px] font-black leading-none">Availability</h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
            Set your weekly coaching hours with simple day buttons. Use Calendar to close one-off dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {props.viewMode === "month" && (
            <>
              <IconButton label="Previous month" onClick={() => props.setMonth(new Date(props.month.getFullYear(), props.month.getMonth() - 1, 1))} icon={<ChevronLeft className="size-4" />} square />
              <div className="flex h-11 min-w-40 items-center justify-center rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-sm font-black">{monthLabel(props.month)}</div>
              <IconButton label="Next month" onClick={() => props.setMonth(new Date(props.month.getFullYear(), props.month.getMonth() + 1, 1))} icon={<ChevronRight className="size-4" />} square />
            </>
          )}
          <div className="ml-2 grid grid-cols-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1">
            {([["grid", "Schedule"], ["month", "Calendar"]] as const).map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => props.setViewMode(mode)} className={`h-9 rounded-[11px] px-4 text-xs font-black ${props.viewMode === mode ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "text-[var(--lobb-text-secondary)]"}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {props.viewMode === "grid" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-4">
            <QuickWeeklySetup
              closeWeeklyDows={props.closeWeeklyDows}
              selectedDows={props.selectedDows}
              setSelectedDows={props.setSelectedDows}
              setWeeklyHoursForDows={props.setWeeklyHoursForDows}
              toggleSelectedDow={props.toggleSelectedDow}
            />
            <WeeklySummaryList
              selectedDate={props.selectedDate}
              setSelectedDate={props.setSelectedDate}
              windows={props.windows}
            />
          </div>
          <SelectedDayPanel
            addWindow={props.addWindow}
            copyWindows={props.copyWindows}
            removeWindow={props.removeWindow}
            selectedBlocked={props.selectedBlocked}
            selectedBookingBlocks={props.selectedBookingBlocks}
            selectedDate={props.selectedDate}
            selectedSlotBlocks={props.selectedSlotBlocks}
            selectedSlots={props.selectedSlots}
            selectedWindows={props.selectedWindows}
            setFullDayBlocked={props.setFullDayBlocked}
            toggleSlotBlock={props.toggleSlotBlock}
            updateWindow={props.updateWindow}
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">{props.selectedDates.length} date{props.selectedDates.length === 1 ? "" : "s"} selected</p>
                <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">Tap calendar days to select multiple dates.</p>
              </div>
              <button
                type="button"
                onClick={() => props.toggleCalendarDate(dateValue(new Date()))}
                className="h-10 rounded-[12px] border border-[var(--lobb-border-subtle)] px-3 text-xs font-black text-[var(--lobb-text-primary)]"
              >
                Today
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 pb-2 text-center text-[11px] font-black text-[var(--lobb-text-secondary)]">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {props.calendarCells.map((cell) => (
                <CalendarDayCard
                  key={cell.value}
                  blocked={blockedDates.has(cell.value)}
                  date={cell.date}
                  inMonth={cell.inMonth}
                  selected={props.selectedDates.includes(cell.value)}
                  slotBlocks={props.slotBlocks.filter((slot) => dateValue(new Date(slot.slot_starts_at)) === cell.value).length}
                  bookingBlocks={props.bookingBlocks.filter((slot) => dateValue(new Date(slot.starts_at)) === cell.value).length}
                  slots={blockedDates.has(cell.value) ? 0 : slotsForDate(cell.value, props.windows).length}
                  onClick={() => props.toggleCalendarDate(cell.value)}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => props.setFullDatesBlocked(props.selectedDates, true)}
                className="h-11 rounded-[14px] bg-[var(--lobb-clay)] text-sm font-black text-white"
              >
                Close selected dates
              </button>
              <button
                type="button"
                onClick={() => props.setFullDatesBlocked(props.selectedDates, false)}
                className="h-11 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-sm font-black"
              >
                Reopen selected dates
              </button>
            </div>
            {props.blocks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {props.blocks.slice(0, 6).map((block) => (
                  <button key={block.blocked_date} type="button" onClick={() => props.toggleCalendarDate(block.blocked_date)} className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--lobb-clay-light)] px-3 py-2 text-xs font-black text-[var(--lobb-clay)]">
                    <span className="h-2 w-8 rounded-full bg-[var(--lobb-error)]/70" />
                    {shortDateLabel(block.blocked_date)}
                  </button>
                ))}
              </div>
            )}
          </section>
          <SelectedDayPanel
            addWindow={props.addWindow}
            updateWindow={props.updateWindow}
            removeWindow={props.removeWindow}
            selectedBlocked={props.selectedBlocked}
            selectedBookingBlocks={props.selectedBookingBlocks}
            selectedDate={props.selectedDate}
            selectedSlotBlocks={props.selectedSlotBlocks}
            selectedSlots={props.selectedSlots}
            selectedWindows={props.selectedWindows}
            setFullDayBlocked={props.setFullDayBlocked}
            toggleSlotBlock={props.toggleSlotBlock}
            copyWindows={props.copyWindows}
          />
        </div>
      )}
    </div>
  );
}

function QuickWeeklySetup({
  closeWeeklyDows,
  selectedDows,
  setSelectedDows,
  setWeeklyHoursForDows,
  toggleSelectedDow,
}: {
  closeWeeklyDows: (dows: number[]) => void;
  selectedDows: number[];
  setSelectedDows: (dows: number[]) => void;
  setWeeklyHoursForDows: (dows: number[], start: string, end: string) => void;
  toggleSelectedDow: (dow: number) => void;
}) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  return (
    <section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-card)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Step 1</p>
          <h2 className="mt-2 text-2xl font-black">Choose days and hours</h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
            Select the weekdays you coach, choose a time window, then apply it. You can fine-tune each day on the right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setSelectedDows([1, 2, 3, 4, 5])} className="h-10 rounded-[12px] border border-[var(--lobb-border-subtle)] px-3 text-xs font-black">Mon-Fri</button>
          <button type="button" onClick={() => setSelectedDows([0, 6])} className="h-10 rounded-[12px] border border-[var(--lobb-border-subtle)] px-3 text-xs font-black">Weekend</button>
          <button type="button" onClick={() => setSelectedDows([0, 1, 2, 3, 4, 5, 6])} className="h-10 rounded-[12px] border border-[var(--lobb-border-subtle)] px-3 text-xs font-black">All days</button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
          const selected = selectedDows.includes(dow);
          return (
            <button
              key={dow}
              type="button"
              onClick={() => toggleSelectedDow(dow)}
              className={`min-h-[76px] rounded-[16px] border px-2 text-center transition ${
                selected
                  ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]"
                  : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/40"
              }`}
            >
              <span className="block text-[11px] font-black uppercase">{DAY_SHORT[dow]}</span>
              <span className="mt-1 block text-lg font-black">{selected ? "Open" : "Off"}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 rounded-[18px] bg-[var(--lobb-bg-primary)] p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <TimeSelect label="Start" value={start} onChange={setStart} />
        <TimeSelect label="End" value={end} onChange={setEnd} />
        <button
          type="button"
          disabled={!selectedDows.length || start >= end}
          onClick={() => setWeeklyHoursForDows(selectedDows, start, end)}
          className="h-10 rounded-[12px] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-black text-[var(--lobb-text-inverse)] disabled:opacity-40"
        >
          Set hours
        </button>
        <button
          type="button"
          disabled={!selectedDows.length}
          onClick={() => closeWeeklyDows(selectedDows)}
          className="h-10 rounded-[12px] border border-[var(--lobb-clay)]/40 px-4 text-xs font-black text-[var(--lobb-clay)] disabled:opacity-40"
        >
          Mark closed
        </button>
      </div>
    </section>
  );
}

function WeeklySummaryList({ selectedDate, setSelectedDate, windows }: { selectedDate: string; setSelectedDate: (date: string) => void; windows: WeeklyWindow[] }) {
  const selectedDow = fromDateValue(selectedDate).getDay();
  const chooseDow = (dow: number) => {
    const date = fromDateValue(selectedDate);
    date.setDate(date.getDate() + (dow - selectedDow));
    setSelectedDate(dateValue(date));
  };

  return (
    <section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black">Weekly schedule</p>
        <p className="text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">Click a day to edit</p>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
          const dayWindows = windowsForDow(windows, dow);
          const active = dow === selectedDow;
          return (
            <button
              key={dow}
              type="button"
              onClick={() => chooseDow(dow)}
              className={`flex min-h-[76px] items-center justify-between gap-3 rounded-[16px] border p-3 text-left transition ${
                active
                  ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)]"
                  : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]/35"
              }`}
            >
              <span>
                <span className="block text-sm font-black">{DAY_NAMES[dow]}</span>
                <span className="mt-1 block text-xs font-semibold text-[var(--lobb-text-secondary)]">
                  {dayWindows.length ? dayWindows.map((window) => `${timeLabel(window.start)} - ${timeLabel(window.end)}`).join(", ") : "Closed"}
                </span>
              </span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${dayWindows.length ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"}`}>
                {dayWindows.length ? "Open" : "Off"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarDayCard({ blocked, bookingBlocks, date, inMonth, onClick, selected, slotBlocks, slots }: { blocked: boolean; bookingBlocks: number; date: Date; inMonth: boolean; onClick: () => void; selected: boolean; slotBlocks: number; slots: number }) {
  const isOpen = slots > 0 && !blocked;
  const detail = bookingBlocks ? `${bookingBlocks} booked` : slotBlocks ? `${slotBlocks} blocked` : isOpen ? "Available" : "—";
  return (
    <button type="button" onClick={onClick} className={`relative min-h-[104px] rounded-[16px] border p-3 text-left transition ${selected ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]" : inMonth ? "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]" : "border-transparent bg-[var(--lobb-bg-secondary)]/40 text-[var(--lobb-text-tertiary)]"}`}>
      {blocked && <span className="absolute left-0 right-0 top-1/2 h-7 -translate-y-1/2 bg-[var(--lobb-error)]/75" />}
      <span className={`relative z-10 inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-white/12" : blocked ? "bg-white/70 text-[var(--lobb-text-primary)]" : "bg-white"}`}>{date.getDate()}</span>
      <div className="relative z-10 mt-5 space-y-1">
        <p className={`text-xs font-black ${selected || blocked ? "text-white" : "text-[var(--lobb-text-primary)]"}`}>{blocked ? "Closed" : isOpen ? `${slots} slots` : "No slots"}</p>
        <p className={`text-[11px] font-semibold ${selected ? "text-white/58" : blocked ? "text-white/85" : "text-[var(--lobb-text-secondary)]"}`}>{detail}</p>
      </div>
    </button>
  );
}

function SelectedDayPanel(props: {
  addWindow: (dow?: number) => void;
  copyWindows: (fromDow: number, toDows: number[]) => void;
  removeWindow: (id: string) => void;
  selectedBlocked: boolean;
  selectedBookingBlocks: BookingSlotBlock[];
  selectedDate: string;
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  updateWindow: (id: string, patch: Partial<Pick<WeeklyWindow, "start" | "end">>) => void;
}) {
  const selectedDow = fromDateValue(props.selectedDate).getDay();
  const weekdayTargets = [1, 2, 3, 4, 5].filter((dow) => dow !== selectedDow);
  const allTargets = [0, 1, 2, 3, 4, 5, 6].filter((dow) => dow !== selectedDow);
  return (
    <aside className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-card)]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Selected day</p>
      <h2 className="mt-2 text-2xl font-black">{selectedDateLabel(props.selectedDate)}</h2>
      <p className="mt-2 rounded-[14px] bg-[var(--lobb-bg-primary)] px-3 py-2 text-xs font-black text-[var(--lobb-text-secondary)]">
        {windowsSummary(props.selectedWindows, selectedDow)}
      </p>
      <DayWindowEditor
        addWindow={props.addWindow}
        dow={selectedDow}
        removeWindow={props.removeWindow}
        selectedWindows={props.selectedWindows}
        updateWindow={props.updateWindow}
      />
      <AvailabilityToggle
        blocked={props.selectedBlocked}
        hasWindows={props.selectedWindows.length > 0}
        onAvailable={() => props.selectedWindows.length ? props.setFullDayBlocked(props.selectedDate, false) : props.addWindow()}
        onClosed={() => props.setFullDayBlocked(props.selectedDate, true)}
      />
      <SlotChips
        selectedBlocked={props.selectedBlocked}
        selectedBookingBlocks={props.selectedBookingBlocks}
        selectedSlotBlocks={props.selectedSlotBlocks}
        selectedSlots={props.selectedSlots}
        toggleSlotBlock={props.toggleSlotBlock}
      />
      <button type="button" onClick={() => props.setFullDayBlocked(props.selectedDate, !props.selectedBlocked)} className="mt-5 h-11 w-full rounded-[14px] border border-[var(--lobb-clay)]/40 text-xs font-black text-[var(--lobb-clay)]">
        {props.selectedBlocked ? "Reopen this day" : "Close this day entirely"}
      </button>
      <button
        type="button"
        disabled={!props.selectedWindows.length || weekdayTargets.length === 0}
        onClick={() => props.copyWindows(selectedDow, weekdayTargets)}
        className="mt-2 h-11 w-full rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-xs font-black text-[var(--lobb-text-primary)] disabled:opacity-45"
      >
        Replace Mon-Fri
      </button>
      <button
        type="button"
        disabled={!props.selectedWindows.length || allTargets.length === 0}
        onClick={() => props.copyWindows(selectedDow, allTargets)}
        className="mt-2 h-11 w-full rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-xs font-black text-[var(--lobb-text-primary)] disabled:opacity-45"
      >
        Replace all days
      </button>
    </aside>
  );
}

function DayWindowEditor({
  addWindow,
  dow,
  removeWindow,
  selectedWindows,
  updateWindow,
}: {
  addWindow: (dow?: number) => void;
  dow: number;
  removeWindow: (id: string) => void;
  selectedWindows: WeeklyWindow[];
  updateWindow: (id: string, patch: Partial<Pick<WeeklyWindow, "start" | "end">>) => void;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--lobb-text-secondary)]">Hours</p>
        <button
          type="button"
          onClick={() => addWindow(dow)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--lobb-bg-inverse)] px-3 text-[11px] font-black text-[var(--lobb-text-inverse)]"
        >
          <Plus className="size-3.5 text-[var(--lobb-clay)]" />
          Add
        </button>
      </div>

      {selectedWindows.length ? (
        <div className="mt-3 space-y-2">
          {selectedWindows.map((window) => (
            <div key={window.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2">
              <TimeSelect
                label="Start"
                value={window.start}
                onChange={(value) => updateWindow(window.id, { start: value })}
              />
              <TimeSelect
                label="End"
                value={window.end}
                onChange={(value) => updateWindow(window.id, { end: value })}
              />
              <button
                type="button"
                onClick={() => removeWindow(window.id)}
                className="flex size-9 items-center justify-center rounded-[12px] border border-[var(--lobb-border-subtle)] text-[var(--lobb-error)]"
                aria-label="Remove hours"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-[14px] bg-[var(--lobb-bg-elevated)] px-3 py-3 text-sm font-semibold text-[var(--lobb-text-secondary)]">
          Closed
        </p>
      )}
    </div>
  );
}

function TimeSelect({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-text-tertiary)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-2 text-xs font-black text-[var(--lobb-text-primary)] outline-none"
      >
        {TIME_OPTIONS.map((minute) => {
          const option = timeFromMinutes(minute);
          return (
            <option key={option} value={option}>
              {timeLabel(option)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function AvailabilityToggle({ blocked, hasWindows, onAvailable, onClosed }: { blocked: boolean; hasWindows: boolean; onAvailable: () => void; onClosed: () => void }) {
  return (
    <div className="mt-5 grid grid-cols-2 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-1">
      <button type="button" onClick={onAvailable} className={`h-10 rounded-[12px] text-xs font-black ${!blocked && hasWindows ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "text-[var(--lobb-text-secondary)]"}`}>Available</button>
      <button type="button" onClick={onClosed} className={`h-10 rounded-[12px] text-xs font-black ${blocked ? "bg-[var(--lobb-clay)] text-white" : "text-[var(--lobb-text-secondary)]"}`}>Closed</button>
    </div>
  );
}

// ── Slot chips ────────────────────────────────────────────────────────────────

function SlotChips({ selectedBlocked, selectedBookingBlocks, selectedSlotBlocks, selectedSlots, toggleSlotBlock }: { selectedBlocked: boolean; selectedBookingBlocks: BookingSlotBlock[]; selectedSlotBlocks: CoachAvailabilitySlotBlock[]; selectedSlots: ReturnType<typeof slotsForDate>; toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void }) {
  if (selectedBlocked) return <EmptyDayCopy text="This day is fully closed. Tap 'Reopen day' above to accept bookings again." />;
  if (!selectedSlots.length) return <EmptyDayCopy text={'No bookable slots yet. Use the Schedule grid to open this day.'} />;
  const blockedCount = selectedSlotBlocks.length;
  const bookedCount = selectedBookingBlocks.length;
  const openCount = selectedSlots.length - blockedCount - bookedCount;
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black">1-hour slots</p>
        <p className="text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">
          {openCount} open · {bookedCount} booked · {blockedCount} blocked
        </p>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">Tap a slot to block or unblock it</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedSlots.map((slot) => {
          const blocked = selectedSlotBlocks.some((item) => item.slot_starts_at === slot.starts_at);
          const booking = selectedBookingBlocks.find((item) => item.starts_at === slot.starts_at);
          const isPending = booking?.status === "pending" || booking?.status === "pending_payment";
          return (
            <button
              key={slot.starts_at}
              type="button"
              disabled={Boolean(booking)}
              title={booking ? `${isPending ? "Payment pending" : "Booked"}${booking.player_name ? ` · ${booking.player_name}` : ""}` : undefined}
              onClick={() => toggleSlotBlock(slot)}
              className={`rounded-[12px] border px-3 py-2 text-left text-xs font-black leading-tight transition-all active:scale-95 disabled:cursor-not-allowed ${
                booking
                  ? isPending
                    ? "border-[var(--lobb-warning)]/40 bg-[var(--lobb-warning)]/12 text-[var(--lobb-clay)]"
                    : "border-[var(--lobb-success)]/30 bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]"
                  : blocked
                    ? "border-[var(--lobb-clay)]/40 bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)] line-through"
                    : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-primary)] hover:border-[var(--lobb-clay)]/30"
              }`}
            >
              <span>{slot.shortLabel}</span>
              {booking && (
                <span className="ml-1 font-semibold opacity-75">
                  {isPending ? "Pending" : "Booked"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile layout ─────────────────────────────────────────────────────────────

function MobileAvailability(props: {
  addWindow: (dow?: number) => void;
  closeWeeklyDows: (dows: number[]) => void;
  copyWindows: (fromDow: number, toDows: number[]) => void;
  updateWindow: (id: string, patch: Partial<Pick<WeeklyWindow, "start" | "end">>) => void;
  removeWindow: (id: string) => void;
  selectedBlocked: boolean;
  selectedDate: string;
  selectedDows: number[];
  selectedBookingBlocks: BookingSlotBlock[];
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  setSelectedDate: (date: string) => void;
  setSelectedDows: (dows: number[]) => void;
  setWeeklyHoursForDows: (dows: number[], start: string, end: string) => void;
  toggleSelectedDow: (dow: number) => void;
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  weekCells: Array<{ date: Date; value: string }>;
  windows: WeeklyWindow[];
}) {
  const selectedDow = fromDateValue(props.selectedDate).getDay();
  const weekdayTargets = [1, 2, 3, 4, 5].filter((dow) => dow !== selectedDow);
  const allTargets = [0, 1, 2, 3, 4, 5, 6].filter((dow) => dow !== selectedDow);

  const goDay = (delta: number) => {
    const d = fromDateValue(props.selectedDate);
    d.setDate(d.getDate() + delta);
    props.setSelectedDate(dateValue(d));
  };

  const goWeek = (delta: number) => {
    const d = fromDateValue(props.selectedDate);
    d.setDate(d.getDate() + delta * 7);
    props.setSelectedDate(dateValue(d));
  };

  return (
    <section className="md:hidden">
      <div className="rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-[14px] bg-[var(--lobb-bg-primary)]">
              <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
            </span>
            <div>
              <p className="font-black">Availability</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                {new Date(props.weekCells[0]?.value + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })} – {new Date(props.weekCells[6]?.value + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <IconButton label="Previous week" onClick={() => goWeek(-1)} icon={<ChevronLeft className="size-4" />} small />
            <IconButton label="Next week" onClick={() => goWeek(1)} icon={<ChevronRight className="size-4" />} small />
          </div>
        </div>

        {/* Day strip */}
        <div className="mt-5 grid grid-cols-7 gap-1 text-center">
          {props.weekCells.map((cell) => {
            const selected = cell.value === props.selectedDate;
            return (
              <button key={cell.value} type="button" onClick={() => props.setSelectedDate(cell.value)} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-[var(--lobb-text-secondary)]">{DAY_SHORT[cell.date.getDay()]}</span>
                <span className={`flex size-9 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-[var(--lobb-clay)] text-white" : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]"}`}>
                  {cell.date.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day detail */}
        <div className="mt-6 rounded-[22px] bg-[var(--lobb-bg-primary)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <IconButton label="Previous day" onClick={() => goDay(-1)} icon={<ChevronLeft className="size-3.5" />} small />
              <p className="text-sm font-black">{selectedDateLabel(props.selectedDate)}</p>
              <IconButton label="Next day" onClick={() => goDay(1)} icon={<ChevronRight className="size-3.5" />} small />
            </div>
            <button
              type="button"
              onClick={() => props.setFullDayBlocked(props.selectedDate, !props.selectedBlocked)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${props.selectedBlocked ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]"}`}
            >
              {props.selectedBlocked ? "● Closed" : "Close day"}
            </button>
          </div>

          <div className="mt-4">
            <QuickWeeklySetup
              closeWeeklyDows={props.closeWeeklyDows}
              selectedDows={props.selectedDows}
              setSelectedDows={props.setSelectedDows}
              setWeeklyHoursForDows={props.setWeeklyHoursForDows}
              toggleSelectedDow={props.toggleSelectedDow}
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-[var(--lobb-text-secondary)]">
              {DAY_NAMES[selectedDow]} hours — repeats weekly
            </p>
            <p className="mb-3 rounded-[12px] bg-[var(--lobb-bg-elevated)] px-3 py-2 text-xs font-black text-[var(--lobb-text-secondary)]">
              {windowsSummary(props.windows, selectedDow)}
            </p>
            <DayWindowEditor
              addWindow={props.addWindow}
              dow={selectedDow}
              removeWindow={props.removeWindow}
              selectedWindows={props.selectedWindows}
              updateWindow={props.updateWindow}
            />
          </div>

          <SlotChips
            selectedBlocked={props.selectedBlocked}
            selectedBookingBlocks={props.selectedBookingBlocks}
            selectedSlotBlocks={props.selectedSlotBlocks}
            selectedSlots={props.selectedSlots}
            toggleSlotBlock={props.toggleSlotBlock}
          />

          <button
            type="button"
            onClick={() => props.setFullDayBlocked(props.selectedDate, !props.selectedBlocked)}
            className="mt-4 h-11 w-full rounded-[14px] border border-[var(--lobb-clay)]/40 text-sm font-black text-[var(--lobb-clay)]"
          >
            {props.selectedBlocked ? "Reopen this day" : "Close this day entirely"}
          </button>
          <button
            type="button"
            disabled={!props.selectedWindows.length || weekdayTargets.length === 0}
            onClick={() => props.copyWindows(selectedDow, weekdayTargets)}
            className="mt-2 h-11 w-full rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-sm font-black disabled:opacity-45"
          >
            Replace Mon-Fri
          </button>
          <button
            type="button"
            disabled={!props.selectedWindows.length || allTargets.length === 0}
            onClick={() => props.copyWindows(selectedDow, allTargets)}
            className="mt-2 h-11 w-full rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-sm font-black disabled:opacity-45"
          >
            Replace all days
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function EmptyDayCopy({ text }: { text: string }) {
  return <p className="mt-4 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3 text-sm font-semibold text-[var(--lobb-text-secondary)]">{text}</p>;
}

function AvailabilityLoading() {
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]"><section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4"><div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, index) => <SkeletonBlock key={index} className="h-[104px] rounded-[16px]" />)}</div></section><SkeletonBlock className="h-[420px] rounded-[26px]" /></div>;
}

function IconButton({ icon, label, onClick, small, square }: { icon: React.ReactNode; label: string; onClick?: () => void; small?: boolean; square?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] ${small ? "size-8 rounded-full" : square ? "size-11 rounded-[14px] border border-[var(--lobb-border-subtle)]" : "size-11 rounded-full"}`} aria-label={label}>{icon}</button>;
}
