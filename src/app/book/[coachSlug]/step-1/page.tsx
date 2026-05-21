"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LockKeyhole, Star } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { showLobbToast } from "@/components/lobb-global-state";
import { CoachCardSkeleton, SkeletonBlock } from "@/components/lobb-skeleton";
import type { AvailableSlot, CoachPublicProfile } from "@/lib/types";

type DayGroup = {
  dateStr: string;
  label: string;
  shortLabel: string;
  weekday: string;
  day: string;
  slots: { iso: string; label: string }[];
};

function groupSlots(raw: AvailableSlot[]): DayGroup[] {
  const map = new Map<string, { iso: string; label: string }[]>();
  for (const s of raw) {
    const d     = new Date(s.slot_starts_at);
    const key   = d.toLocaleDateString("en-CA");
    const label = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
    const arr   = map.get(key) ?? [];
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

  const [coach,     setCoach]     = useState<CoachPublicProfile | null>(null);
  const [groups,    setGroups]    = useState<DayGroup[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [locking,   setLocking]   = useState(false);
  const [weekStart, setWeekStart] = useState(0);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

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
        if (g.length > 0) setSelectedDate(g[0].dateStr);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const visibleGroups = useMemo(() => {
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
      <BookingShell step={1} backHref={`/coaches/${slug}`}>
        <div className="space-y-6">
          <CoachCardSkeleton />
          <SkeletonBlock className="h-5 w-36" />
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-2xl" />)}
          </div>
          <SkeletonBlock className="h-5 w-44" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-12 rounded-full" />)}
          </div>
        </div>
      </BookingShell>
    );
  }

  return (
    <BookingShell step={1} backHref={`/coaches/${slug}`}>
      {/* Coach card */}
      {coach && (
        <section className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
          <div className="flex items-center gap-3">
            <div className="size-14 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
              {coach.profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black truncate">{coach.full_name}</h2>
              <p className="text-sm font-medium text-[var(--lobb-muted)] truncate">{coach.headline}</p>
              <div className="mt-1.5 flex items-center gap-3">
                {coach.avg_rating != null && (
                  <span className="flex items-center gap-1 text-xs font-black">
                    <Star className="size-3 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
                    {coach.avg_rating}
                  </span>
                )}
                {coach.hourly_rate_ngn != null && (
                  <span className="text-xs font-black text-[var(--lobb-clay)]">
                    ₦{coach.hourly_rate_ngn.toLocaleString()}
                    <span className="font-semibold text-[var(--lobb-muted)]">/hr</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Week navigation */}
      <div className="mt-6 rounded-[26px] border border-black/[0.08] bg-[rgba(250,250,250,0.88)] p-4 shadow-[0_14px_34px_rgba(13,13,13,0.06)]">
        <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
            <CalendarDays className="size-3.5 text-[var(--lobb-clay)]" />
            Select a date
          </p>
          <h2 className="mt-1 text-lg font-black">{weekLabel}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={weekStart === 0}
            onClick={() => { setWeekStart(0); setSelectedSlot(""); }}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-white disabled:opacity-30"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            disabled={weekStart === 7}
            onClick={() => { setWeekStart(7); setSelectedSlot(""); }}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-white disabled:opacity-30"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        </div>

      {/* Day grid */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {visibleGroups.map((item) => {
          const hasSlots = item.slots.length > 0;
          const isSelected = item.dateStr === selectedDate && hasSlots;
          return (
            <button
              key={item.dateStr}
              disabled={!hasSlots}
              onClick={() => { setSelectedDate(item.dateStr); setSelectedSlot(""); }}
              className={`relative flex min-h-[70px] flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-semibold transition ${
                isSelected
                  ? "bg-[var(--lobb-black)] text-white shadow-[0_12px_24px_rgba(13,13,13,0.18)]"
                  : hasSlots
                  ? "border border-[var(--lobb-border)] bg-white hover:border-[var(--lobb-black)]"
                  : "border border-transparent bg-[var(--lobb-surface-2)] text-[#9b958a] opacity-45"
              }`}
            >
              <span className="text-[10px] font-black uppercase">{item.weekday}</span>
              <span className="text-lg font-black leading-none">{item.day}</span>
              {hasSlots && (
                <span className={`size-1.5 rounded-full ${isSelected ? "bg-white/60" : "bg-[var(--lobb-clay)]"}`} />
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* Time slots */}
      {selectedGroup ? (
        <>
          <h3 className="mt-6 font-black">
            Available times
            <span className="ml-2 text-sm font-semibold text-[var(--lobb-muted)]">— {selectedGroup.label}</span>
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {selectedGroup.slots.map((slot) => (
              <button
                key={slot.iso}
                onClick={() => setSelectedSlot(slot.iso)}
                className={`h-14 rounded-[18px] border text-sm font-black transition ${
                  selectedSlot === slot.iso
                    ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white shadow-[0_12px_24px_rgba(13,13,13,0.18)]"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 text-center">
          <p className="text-sm font-black text-[var(--lobb-black)]">No slots this week</p>
          <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">
            {weekStart === 0 ? "Try the next week →" : "No availability in the next 2 weeks"}
          </p>
        </div>
      )}

      {/* Info strip */}
      <div className="mt-5 space-y-2 text-sm font-semibold text-[var(--lobb-muted)]">
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 shrink-0" /> 60 minute session
        </p>
        {selectedSlot && (
          <p className="flex items-start gap-2 text-[var(--lobb-success)]">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" />
            We reserve the slot for 10 minutes after you continue, then release it automatically if payment is not completed.
          </p>
        )}
      </div>

      <BookingButton disabled={!selectedSlot || locking} onClick={handleContinue}>
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
