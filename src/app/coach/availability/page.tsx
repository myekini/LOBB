"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, MoreVertical, Plus, Trash2 } from "lucide-react";
import type { CoachAvailabilityBlock, CoachAvailabilityRow, CoachAvailabilitySlotBlock } from "@/lib/types";
import { InlineActionLoader, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { showLobbToast } from "@/providers/lobb-global-state";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function windowsForDow(windows: WeeklyWindow[], dow: number) {
  return windows.filter((window) => window.dow === dow).sort((a, b) => a.start.localeCompare(b.start));
}

function slotsForDate(dateString: string, windows: WeeklyWindow[]) {
  const dow = fromDateValue(dateString).getDay();
  const dayWindows = windowsForDow(windows, dow);
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

function hasOverlaps(windows: WeeklyWindow[]) {
  for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
    const dayWindows = windowsForDow(windows, dow);
    for (let index = 1; index < dayWindows.length; index += 1) {
      if (minutes(dayWindows[index].start) < minutes(dayWindows[index - 1].end)) return DAY_NAMES[dow];
    }
  }
  return null;
}

function createWindow(dow: number, existing: WeeklyWindow[]): WeeklyWindow {
  const latest = windowsForDow(existing, dow).at(-1);
  const start = latest ? timeFromMinutes(minutes(latest.end) + 60) : "09:00";
  const end = timeFromMinutes(minutes(start) + 60);
  return { id: `local-${dow}-${Date.now()}`, dow, start, end };
}

export default function CoachAvailabilityPage() {
  const router = useRouter();
  const [windows, setWindows] = useState<WeeklyWindow[]>([]);
  const [blocks, setBlocks] = useState<CoachAvailabilityBlock[]>([]);
  const [slotBlocks, setSlotBlocks] = useState<CoachAvailabilitySlotBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateValue(new Date()));
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
      };
      setWindows(windowsFromRows(json.slots));
      setBlocks(json.blocks);
      setSlotBlocks(json.slot_blocks ?? []);
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
  const calendarCells = useMemo(() => buildCalendar(month), [month]);
  const weekCells = useMemo(() => weekFor(selectedDate), [selectedDate]);

  const setFullDayBlocked = (dateString: string, blocked: boolean) => {
    setBlocks((prev) => {
      const exists = prev.some((block) => block.blocked_date === dateString);
      if (blocked && exists) return prev;
      if (!blocked) return prev.filter((block) => block.blocked_date !== dateString);
      return [...prev, { id: `local-${Date.now()}`, coach_id: "", blocked_date: dateString, reason: null, created_at: new Date().toISOString() }]
        .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date));
    });
    setSaved(false);
  };

  const addWindow = (dow = selectedDow) => {
    setWindows((prev) => [...prev, createWindow(dow, prev)]);
    setFullDayBlocked(selectedDate, false);
    setSaved(false);
  };

  const updateWindow = (id: string, updates: Partial<WeeklyWindow>) => {
    setWindows((prev) => prev.map((window) => (window.id === id ? { ...window, ...updates } : window)));
    setSaved(false);
  };

  const removeWindow = (id: string) => {
    setWindows((prev) => prev.filter((window) => window.id !== id));
    setSaved(false);
  };

  const toggleSlotBlock = (slot: { starts_at: string; ends_at: string }) => {
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
    setSaved(false);
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
          <p className="font-black">Availability</p>
          <IconButton label="Options" icon={<MoreVertical className="size-4" />} />
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
              selectedSlotBlocks={selectedSlotBlocks}
              selectedSlots={selectedSlots}
              selectedWindows={selectedWindows}
              setFullDayBlocked={setFullDayBlocked}
              setMonth={setMonth}
              setSelectedDate={setSelectedDate}
              setViewMode={setViewMode}
              slotBlocks={slotBlocks}
              toggleSlotBlock={toggleSlotBlock}
              viewMode={viewMode}
              windows={windows}
              addWindow={addWindow}
              removeWindow={removeWindow}
              updateWindow={updateWindow}
            />
            <MobileAvailability
              addWindow={addWindow}
              removeWindow={removeWindow}
              selectedBlocked={selectedBlocked}
              selectedDate={selectedDate}
              selectedSlotBlocks={selectedSlotBlocks}
              selectedSlots={selectedSlots}
              selectedWindows={selectedWindows}
              setFullDayBlocked={setFullDayBlocked}
              setSelectedDate={setSelectedDate}
              toggleSlotBlock={toggleSlotBlock}
              updateWindow={updateWindow}
              weekCells={weekCells}
            />
            {(saved || error) && (
              <p className={`mt-5 rounded-[14px] px-4 py-2 text-sm font-black ${error ? "bg-[#fff0e8] text-[var(--lobb-clay-dark)]" : "bg-[#e8f4ed] text-[var(--lobb-success)]"}`}>
                {error || "Availability saved successfully."}
              </p>
            )}
          </>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]/96 p-3 shadow-[var(--lobb-shadow-sheet)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <button type="button" onClick={() => { setError(""); setSaved(false); }} className="hidden h-11 rounded-[14px] border border-[var(--lobb-border-subtle)] px-5 text-sm font-black text-[var(--lobb-text-secondary)] sm:block">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={loading || saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] disabled:opacity-60 sm:flex-none sm:px-9">
            {saving ? <InlineActionLoader label="Saving" /> : "Save Availability"}
          </button>
        </div>
      </footer>
    </main>
  );
}

function DesktopAvailability(props: {
  blocks: CoachAvailabilityBlock[];
  calendarCells: CalendarCell[];
  month: Date;
  selectedBlocked: boolean;
  selectedDate: string;
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  setMonth: (date: Date) => void;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: "month" | "week") => void;
  slotBlocks: CoachAvailabilitySlotBlock[];
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  viewMode: "month" | "week";
  windows: WeeklyWindow[];
  addWindow: (dow?: number) => void;
  removeWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WeeklyWindow>) => void;
}) {
  const blockedDates = new Set(props.blocks.map((block) => block.blocked_date));
  return (
    <div className="hidden md:block">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Bookable slots</p>
          <h1 className="mt-2 text-[34px] font-black leading-none">Availability</h1>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
            Manage your weekly coaching schedule and block unavailable dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Previous month" onClick={() => props.setMonth(new Date(props.month.getFullYear(), props.month.getMonth() - 1, 1))} icon={<ChevronLeft className="size-4" />} square />
          <div className="flex h-11 min-w-40 items-center justify-center rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-sm font-black">{monthLabel(props.month)}</div>
          <IconButton label="Next month" onClick={() => props.setMonth(new Date(props.month.getFullYear(), props.month.getMonth() + 1, 1))} icon={<ChevronRight className="size-4" />} square />
          <div className="ml-2 grid grid-cols-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1">
            {(["month", "week"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => props.setViewMode(mode)} className={`h-9 rounded-[11px] px-4 text-xs font-black capitalize ${props.viewMode === mode ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]" : "text-[var(--lobb-text-secondary)]"}`}>{mode}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
        <section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
          <div className="grid grid-cols-7 gap-2 pb-2 text-center text-[11px] font-black text-[var(--lobb-text-secondary)]">
            {DAY_SHORT.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {props.calendarCells.map((cell) => (
              <CalendarDayCard
                key={cell.value}
                blocked={blockedDates.has(cell.value)}
                date={cell.date}
                inMonth={cell.inMonth}
                selected={cell.value === props.selectedDate}
                slotBlocks={props.slotBlocks.filter((slot) => dateValue(new Date(slot.slot_starts_at)) === cell.value).length}
                slots={blockedDates.has(cell.value) ? 0 : slotsForDate(cell.value, props.windows).length}
                onClick={() => props.setSelectedDate(cell.value)}
              />
            ))}
          </div>
          {props.blocks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {props.blocks.slice(0, 6).map((block) => (
                <button key={block.blocked_date} type="button" onClick={() => props.setSelectedDate(block.blocked_date)} className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--lobb-clay-light)] px-3 py-2 text-xs font-black text-[var(--lobb-clay)]">
                  <span className="h-2 w-8 rounded-full bg-[var(--lobb-error)]/70" />
                  {shortDateLabel(block.blocked_date)}
                </button>
              ))}
            </div>
          )}
        </section>
        <SelectedDayPanel {...props} />
      </div>
    </div>
  );
}

function CalendarDayCard({ blocked, date, inMonth, onClick, selected, slotBlocks, slots }: { blocked: boolean; date: Date; inMonth: boolean; onClick: () => void; selected: boolean; slotBlocks: number; slots: number }) {
  const isOpen = slots > 0 && !blocked;
  return (
    <button type="button" onClick={onClick} className={`relative min-h-[104px] rounded-[16px] border p-3 text-left transition ${selected ? "border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)]" : inMonth ? "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]" : "border-transparent bg-[var(--lobb-bg-secondary)]/40 text-[var(--lobb-text-tertiary)]"}`}>
      {blocked && <span className="absolute left-0 right-0 top-1/2 h-7 -translate-y-1/2 bg-[var(--lobb-error)]/75" />}
      <span className={`relative z-10 inline-flex size-7 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-white/12" : blocked ? "bg-white/70 text-[var(--lobb-text-primary)]" : "bg-white"}`}>{date.getDate()}</span>
      <div className="relative z-10 mt-5 space-y-1">
        <p className={`text-xs font-black ${selected || blocked ? "text-white" : "text-[var(--lobb-text-primary)]"}`}>{blocked ? "Closed" : isOpen ? `${slots} slots` : "No slots"}</p>
        <p className={`text-[11px] font-semibold ${selected ? "text-white/58" : blocked ? "text-white/85" : "text-[var(--lobb-text-secondary)]"}`}>{slotBlocks ? `${slotBlocks} blocked` : isOpen ? "Available" : "$0"}</p>
      </div>
    </button>
  );
}

function SelectedDayPanel(props: {
  addWindow: (dow?: number) => void;
  removeWindow: (id: string) => void;
  selectedBlocked: boolean;
  selectedDate: string;
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  updateWindow: (id: string, updates: Partial<WeeklyWindow>) => void;
}) {
  return (
    <aside className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-card)]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Selected day</p>
      <h2 className="mt-2 text-2xl font-black">{selectedDateLabel(props.selectedDate)}</h2>
      <AvailabilityToggle blocked={props.selectedBlocked} hasWindows={props.selectedWindows.length > 0} onAvailable={() => props.selectedWindows.length ? props.setFullDayBlocked(props.selectedDate, false) : props.addWindow()} onClosed={() => props.setFullDayBlocked(props.selectedDate, true)} />
      <WindowEditor windows={props.selectedWindows} addWindow={props.addWindow} removeWindow={props.removeWindow} updateWindow={props.updateWindow} />
      <SlotChips selectedBlocked={props.selectedBlocked} selectedSlotBlocks={props.selectedSlotBlocks} selectedSlots={props.selectedSlots} toggleSlotBlock={props.toggleSlotBlock} />
      <button type="button" onClick={() => props.setFullDayBlocked(props.selectedDate, !props.selectedBlocked)} className="mt-5 h-11 w-full rounded-[14px] border border-[var(--lobb-clay)] text-xs font-black text-[var(--lobb-clay)]">
        {props.selectedBlocked ? "Reopen Full Day" : "Block Full Day"}
      </button>
    </aside>
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

function WindowEditor({ addWindow, removeWindow, updateWindow, windows }: { addWindow: () => void; removeWindow: (id: string) => void; updateWindow: (id: string, updates: Partial<WeeklyWindow>) => void; windows: WeeklyWindow[] }) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">Weekly windows</p>
        <button type="button" onClick={addWindow} className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--lobb-clay)]"><Plus className="size-3.5" />Add window</button>
      </div>
      {windows.length ? (
        <div className="mt-3 space-y-2">
          {windows.map((window) => (
            <div key={window.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-[16px] bg-[var(--lobb-bg-primary)] p-2">
              <TimeInput value={window.start} onChange={(value) => updateWindow(window.id, { start: value })} />
              <span className="text-xs font-black text-[var(--lobb-text-tertiary)]">to</span>
              <TimeInput value={window.end} onChange={(value) => updateWindow(window.id, { end: value })} />
              <button type="button" onClick={() => removeWindow(window.id)} className="flex size-10 items-center justify-center rounded-[12px] text-[var(--lobb-text-tertiary)] hover:text-[var(--lobb-error)]" aria-label="Remove window"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyDayCopy text="Closed weekly. Add a window to accept bookings on this weekday." />
      )}
    </div>
  );
}

function SlotChips({ selectedBlocked, selectedSlotBlocks, selectedSlots, toggleSlotBlock }: { selectedBlocked: boolean; selectedSlotBlocks: CoachAvailabilitySlotBlock[]; selectedSlots: ReturnType<typeof slotsForDate>; toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void }) {
  if (selectedBlocked) return <EmptyDayCopy text="This date is blocked. Reopen it to accept bookings." />;
  if (!selectedSlots.length) return <EmptyDayCopy text="No bookable slots yet. Add a weekly window for this day." />;
  return (
    <div className="mt-5">
      <p className="text-sm font-black">Bookable slots</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedSlots.map((slot) => {
          const blocked = selectedSlotBlocks.some((item) => item.slot_starts_at === slot.starts_at);
          return (
            <button key={slot.starts_at} type="button" onClick={() => toggleSlotBlock(slot)} className={`rounded-[12px] border px-3 py-2 text-xs font-black ${blocked ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]" : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-primary)]"}`}>
              {blocked ? "Blocked " : ""}{slot.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileAvailability(props: {
  addWindow: (dow?: number) => void;
  removeWindow: (id: string) => void;
  selectedBlocked: boolean;
  selectedDate: string;
  selectedSlotBlocks: CoachAvailabilitySlotBlock[];
  selectedSlots: ReturnType<typeof slotsForDate>;
  selectedWindows: WeeklyWindow[];
  setFullDayBlocked: (dateString: string, blocked: boolean) => void;
  setSelectedDate: (date: string) => void;
  toggleSlotBlock: (slot: { starts_at: string; ends_at: string }) => void;
  updateWindow: (id: string, updates: Partial<WeeklyWindow>) => void;
  weekCells: Array<{ date: Date; value: string }>;
}) {
  const currentIndex = props.weekCells.findIndex((cell) => cell.value === props.selectedDate);
  const firstSlot = props.selectedSlots[0];
  const lastSlot = props.selectedSlots.at(-1);
  return (
    <section className="md:hidden">
      <div className="rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[14px] bg-[var(--lobb-bg-primary)]"><CalendarDays className="size-4 text-[var(--lobb-clay)]" /></span><div><p className="font-black">Availability</p><p className="mt-1 text-sm font-semibold text-[var(--lobb-text-secondary)]">This Week</p></div></div>
          <div className="flex gap-2">
            <IconButton label="Previous day" onClick={() => props.setSelectedDate(props.weekCells[Math.max(0, currentIndex - 1)]?.value ?? props.selectedDate)} icon={<ChevronLeft className="size-4" />} small />
            <IconButton label="Next day" onClick={() => props.setSelectedDate(props.weekCells[Math.min(6, currentIndex + 1)]?.value ?? props.selectedDate)} icon={<ChevronRight className="size-4" />} small />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-center">
          {props.weekCells.map((cell) => {
            const selected = cell.value === props.selectedDate;
            return <button key={cell.value} type="button" onClick={() => props.setSelectedDate(cell.value)} className="flex flex-col items-center gap-2"><span className="text-[10px] font-black text-[var(--lobb-text-secondary)]">{DAY_SHORT[cell.date.getDay()]}</span><span className={`flex size-9 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-[var(--lobb-clay)] text-white" : "bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)]"}`}>{cell.date.getDate()}</span></button>;
          })}
        </div>
        <div className="mt-6 rounded-[22px] bg-[var(--lobb-bg-primary)] p-4">
          <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm font-black"><CalendarDays className="size-4" />{selectedDateLabel(props.selectedDate)}</p><button type="button" onClick={() => props.setFullDayBlocked(props.selectedDate, !props.selectedBlocked)} className="text-xs font-black text-[var(--lobb-clay)]">{props.selectedBlocked ? "Reopen" : "Close day"}</button></div>
          <div className="mt-4 flex items-center justify-between text-xs font-black text-[var(--lobb-text-secondary)]"><span>{firstSlot ? firstSlot.label.split(" - ")[0] : "No slots"}</span><span>{lastSlot ? lastSlot.label.split(" - ")[1] : "Closed"}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--lobb-bg-secondary)]"><div className={`h-full rounded-full ${props.selectedBlocked || !props.selectedSlots.length ? "w-0" : "w-4/5 bg-[var(--lobb-success)]"}`} /></div>
          <WindowEditor windows={props.selectedWindows} addWindow={props.addWindow} removeWindow={props.removeWindow} updateWindow={props.updateWindow} />
          <SlotChips selectedBlocked={props.selectedBlocked} selectedSlotBlocks={props.selectedSlotBlocks} selectedSlots={props.selectedSlots} toggleSlotBlock={props.toggleSlotBlock} />
          <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => props.setFullDayBlocked(props.selectedDate, true)} className="h-12 rounded-[16px] bg-white text-sm font-black">Cancel</button><button type="button" onClick={() => { props.addWindow(); props.setFullDayBlocked(props.selectedDate, false); }} className="h-12 rounded-[16px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]">Confirm</button></div>
        </div>
      </div>
    </section>
  );
}

function EmptyDayCopy({ text }: { text: string }) {
  return <p className="mt-4 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3 text-sm font-semibold text-[var(--lobb-text-secondary)]">{text}</p>;
}

function AvailabilityLoading() {
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]"><section className="rounded-[26px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4"><div className="grid grid-cols-7 gap-2">{Array.from({ length: 35 }).map((_, index) => <SkeletonBlock key={index} className="h-[104px] rounded-[16px]" />)}</div></section><SkeletonBlock className="h-[420px] rounded-[26px]" /></div>;
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="flex h-11 items-center gap-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3"><Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" /><input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black outline-none" /></label>;
}

function IconButton({ icon, label, onClick, small, square }: { icon: React.ReactNode; label: string; onClick?: () => void; small?: boolean; square?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] ${small ? "size-8 rounded-full" : square ? "size-11 rounded-[14px] border border-[var(--lobb-border-subtle)]" : "size-11 rounded-full"}`} aria-label={label}>{icon}</button>;
}
