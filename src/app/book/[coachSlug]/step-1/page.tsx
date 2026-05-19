"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3, LockKeyhole, Star } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { showLobbToast } from "@/components/lobb-global-state";
import { CoachCardSkeleton, SkeletonBlock } from "@/components/lobb-skeleton";
import type { AvailableSlot, CoachPublicProfile } from "@/lib/types";

type DayGroup = {
  dateStr: string;   // "YYYY-MM-DD"
  label: string;     // "Mon 19 May"
  shortLabel: string;// "Mon 19"
  weekday: string;   // "Mon"
  day: string;       // "19"
  slots: { iso: string; label: string }[];
};

function groupSlots(raw: AvailableSlot[]): DayGroup[] {
  const map = new Map<string, { iso: string; label: string }[]>();
  for (const s of raw) {
    const d      = new Date(s.slot_starts_at);
    const key    = d.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    const label  = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
    const arr    = map.get(key) ?? [];
    arr.push({ iso: s.slot_starts_at, label });
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, slots]) => {
      const d = new Date(dateStr + "T00:00:00");
      return {
        dateStr,
        label:      d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
        shortLabel: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric" }),
        weekday:    d.toLocaleDateString("en-NG", { weekday: "short" }),
        day:        d.toLocaleDateString("en-NG", { day: "numeric" }),
        slots,
      };
    });
}

function BookingStep1Content() {
  const params = useParams<{ coachSlug: string }>();
  const router = useRouter();
  const slug   = params.coachSlug;

  const [coach,    setCoach]    = useState<CoachPublicProfile | null>(null);
  const [groups,   setGroups]   = useState<DayGroup[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [locking,  setLocking]  = useState(false);
  const [weekStart, setWeekStart] = useState(0); // 0 = first week, 7 = second week

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Load coach + slots
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coachRes, slotsRes] = await Promise.all([
        fetch(`/api/coaches/${slug}`),
        fetch(`/api/coaches/${slug}/slots`),
      ]);

      if (coachRes.ok) {
        const { coach: c } = (await coachRes.json()) as { coach: CoachPublicProfile };
        setCoach(c);
      }

      if (slotsRes.ok) {
        const { slots } = (await slotsRes.json()) as { slots: AvailableSlot[] };
        const g = groupSlots(slots);
        setGroups(g);
        // Pre-select first available day
        if (g.length > 0) setSelectedDate(g[0].dateStr);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Show 7 days at a time (the 14-day window split into two weeks)
  const visibleGroups = useMemo(() => {
    // Build a 7-day grid for the current week slice, marking days with/without slots
    const slotMap = new Map(groups.map((g) => [g.dateStr, g]));
    const days: (DayGroup | { dateStr: string; weekday: string; day: string; label: string; shortLabel: string; slots: never[] })[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = weekStart; i < weekStart + 7; i++) {
      const d   = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-CA");
      days.push(
        slotMap.get(key) ?? {
          dateStr:    key,
          label:      d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }),
          shortLabel: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric" }),
          weekday:    d.toLocaleDateString("en-NG", { weekday: "short" }),
          day:        d.toLocaleDateString("en-NG", { day: "numeric" }),
          slots:      [],
        }
      );
    }
    return days;
  }, [groups, weekStart]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.dateStr === selectedDate) ?? null,
    [groups, selectedDate]
  );

  // Week range label
  const weekLabel = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const start = new Date(base.getTime() + weekStart * 24 * 60 * 60 * 1000);
    const end   = new Date(base.getTime() + (weekStart + 6) * 24 * 60 * 60 * 1000);
    const fmt   = (d: Date) => d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
    return `${fmt(start)} — ${fmt(end)}`;
  }, [weekStart]);

  const handleContinue = async () => {
    if (!selectedSlot || locking) return;

    setLocking(true);
    try {
      const res = await fetch("/api/bookings/lock", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ coach_slug: slug, slot_starts_at: selectedSlot }),
      });

      const json = (await res.json()) as { lock_id?: string; expires_at?: string; error?: string };

      if (!res.ok || !json.lock_id) {
        showLobbToast({ type: "error", message: json.error ?? "Slot unavailable. Choose another." });
        return;
      }

      showLobbToast({ type: "info", message: "Slot held for 10 minutes." });
      router.push(
        `/book/${slug}/step-2?slot=${encodeURIComponent(selectedSlot)}&lock=${json.lock_id}&expires=${encodeURIComponent(json.expires_at!)}`
      );
    } catch {
      showLobbToast({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLocking(false);
    }
  };

  if (loading) {
    return (
      <BookingShell step={1}>
        <div className="space-y-6">
          <CoachCardSkeleton />
          <SkeletonBlock className="h-5 w-36" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, index) => <SkeletonBlock key={index} className="h-14 rounded-2xl" />)}
          </div>
          <SkeletonBlock className="h-5 w-44" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-12 rounded-full" />)}
          </div>
        </div>
      </BookingShell>
    );
  }

  return (
    <BookingShell step={1}>
      {/* Coach card */}
      {coach && (
        <section className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
          <div className="flex items-center gap-3">
            <div className="size-12 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
              {coach.profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              )}
            </div>
            <div>
              <h2 className="font-black">{coach.full_name}</h2>
              <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.headline}</p>
              {coach.avg_rating != null && (
                <p className="mt-1 flex items-center gap-1 text-xs font-black">
                  <Star className="size-3 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
                  {coach.avg_rating}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Week navigation */}
      <h2 className="mt-6 font-black">Select your date</h2>
      <div className="mt-3 flex items-center justify-between text-sm font-bold text-[var(--lobb-muted)]">
        <button
          disabled={weekStart === 0}
          onClick={() => { setWeekStart(0); setSelectedSlot(""); }}
          className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] disabled:opacity-30"
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-xs">{weekLabel}</p>
        <button
          disabled={weekStart === 7}
          onClick={() => { setWeekStart(7); setSelectedSlot(""); }}
          className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] disabled:opacity-30"
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Day grid */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {visibleGroups.map((item) => {
          const hasSlots = item.slots.length > 0;
          const isSelected = item.dateStr === selectedDate;
          return (
            <button
              key={item.dateStr}
              disabled={!hasSlots}
              onClick={() => { setSelectedDate(item.dateStr); setSelectedSlot(""); }}
              className={`rounded-2xl border py-2 text-xs font-semibold ${
                isSelected && hasSlots
                  ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white"
                  : hasSlots
                  ? "border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
                  : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[#9b958a]"
              }`}
            >
              <span className="block font-bold">{item.weekday}</span>
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      {selectedGroup ? (
        <>
          <h3 className="mt-6 font-black">Available times — {selectedGroup.label}</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {selectedGroup.slots.map((slot) => (
              <button
                key={slot.iso}
                onClick={() => setSelectedSlot(slot.iso)}
                className={`h-12 rounded-full border text-sm font-black ${
                  selectedSlot === slot.iso
                    ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm font-semibold text-[var(--lobb-muted)]">
          No slots available in this week. Try the next week →
        </p>
      )}

      {/* Info strip */}
      <div className="mt-5 space-y-2 text-sm font-semibold text-[var(--lobb-muted)]">
        <p className="flex items-center gap-2">
          <Clock3 className="size-4" /> Duration: 60 minutes
        </p>
        {selectedSlot && (
          <p className="flex items-start gap-2 text-[var(--lobb-success)]">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            Slot held for 10 minutes after you proceed.
          </p>
        )}
      </div>

      <BookingButton
        disabled={!selectedSlot || locking}
        onClick={handleContinue}
      >
        {locking ? "Locking slot..." : "Continue →"}
      </BookingButton>
    </BookingShell>
  );
}

export default function BookingStepOnePage() {
  return (
    <Suspense fallback={null}>
      <BookingStep1Content />
    </Suspense>
  );
}
