"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LockKeyhole, Star } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import { CoachCardSkeleton, SkeletonBlock } from "@/components/common/lobb-skeleton";
import type { AvailableSlot, CoachPublicProfile } from "@/lib/types";
import { track } from "@/lib/analytics";

const MIN_ADVANCE_MS = 24 * 60 * 60 * 1000;
function isTooSoon(iso: string): boolean {
  return new Date(iso).getTime() < Date.now() + MIN_ADVANCE_MS;
}

type DayGroup = {
  dateStr: string;
  label: string;
  shortLabel: string;
  weekday: string;
  day: string;
  slots: { iso: string; label: string; tooSoon: boolean }[];
};

function groupSlots(raw: AvailableSlot[]): DayGroup[] {
  const map = new Map<string, { iso: string; label: string; tooSoon: boolean }[]>();
  for (const s of raw) {
    const d     = new Date(s.slot_starts_at);
    const key   = d.toLocaleDateString("en-CA");
    const label = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
    const arr   = map.get(key) ?? [];
    arr.push({ iso: s.slot_starts_at, label, tooSoon: isTooSoon(s.slot_starts_at) });
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

  const [coach,       setCoach]       = useState<CoachPublicProfile | null>(null);
  const [groups,      setGroups]      = useState<DayGroup[]>([]);
  const [coachStatus, setCoachStatus] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [locking,     setLocking]     = useState(false);
  const [weekStart,   setWeekStart]   = useState(0);

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
        const data = (await slotsRes.json()) as { slots: AvailableSlot[]; status?: string };
        setCoachStatus(data.status ?? null);
        const g = groupSlots(data.slots);
        setGroups(g);
        const firstBookable = g.find((day) => day.slots.some((s) => !s.tooSoon));
        if (firstBookable) setSelectedDate(firstBookable.dateStr);
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
      track("Booking Started", {
        coach_slug: slug,
        coach_name: coach?.full_name,
        coach_rate: coach?.hourly_rate_ngn,
        slot_iso: selectedSlot,
      });
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
        <section className="overflow-hidden rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)]">
          <div className="h-2 bg-[linear-gradient(90deg,var(--lobb-clay),var(--lobb-star))]" />
          <div className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-[22px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] shadow-sm">
              {coach.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-[var(--lobb-bg-secondary)] font-bold text-[var(--lobb-text-secondary)]">
                  {coach.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Booking with</p>
              <h2 className="mt-1 truncate text-base font-black text-[var(--lobb-text-primary)]">{coach.full_name}</h2>
              <p className="mt-0.5 truncate text-xs font-semibold text-[var(--lobb-text-secondary)]">{coach.headline}</p>
              <div className="mt-2 flex items-center gap-3">
                {coach.avg_rating != null && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--lobb-clay-light)] px-2 py-0.5 text-[11px] font-black text-[var(--lobb-clay)]">
                    <Star className="size-3 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
                    {coach.avg_rating}
                  </span>
                )}
                {coach.hourly_rate_ngn != null && (
                  <span className="text-[11px] font-black text-[var(--lobb-clay)]">
                    ₦{coach.hourly_rate_ngn.toLocaleString()}
                    <span className="font-semibold text-[var(--lobb-text-secondary)]">/hr</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          </div>
        </section>
      )}

      {/* Week navigation */}
      <div className="mt-4 rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)] sm:p-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
              <CalendarDays className="size-3.5 text-[var(--lobb-clay)]" />
              Available dates
            </p>
            <h2 className="mt-1 text-base font-black text-[var(--lobb-text-primary)]">{weekLabel}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={weekStart === 0}
              onClick={() => { setWeekStart(0); setSelectedSlot(""); }}
              className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-sm transition-all hover:border-[var(--lobb-clay)] disabled:opacity-30 disabled:shadow-none"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4 text-[var(--lobb-text-primary)]" />
            </button>
            <button
              disabled={weekStart === 7}
              onClick={() => { setWeekStart(7); setSelectedSlot(""); }}
              className="flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-sm transition-all hover:border-[var(--lobb-clay)] disabled:opacity-30 disabled:shadow-none"
              aria-label="Next week"
            >
              <ChevronRight className="size-4 text-[var(--lobb-text-primary)]" />
            </button>
          </div>
        </div>

        {/* Day grid */}
        <div className="mt-5 grid grid-cols-7 gap-2">
          {visibleGroups.map((item) => {
            const hasSlots    = item.slots.length > 0;
            const hasBookable = item.slots.some((s) => !s.tooSoon);
            const isSelected  = item.dateStr === selectedDate && hasBookable;
            return (
              <button
                key={item.dateStr}
                disabled={!hasBookable}
                onClick={() => { setSelectedDate(item.dateStr); setSelectedSlot(""); }}
                className={`relative flex min-h-[82px] flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-semibold transition-all duration-300 active:scale-95 ${
                  isSelected
                    ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[0_16px_30px_rgba(13,13,13,0.2)] scale-[1.03]"
                    : hasBookable
                    ? "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]/50 hover:bg-[var(--lobb-bg-elevated)]"
                    : "cursor-not-allowed border border-transparent bg-[var(--lobb-bg-secondary)]/70 text-[var(--lobb-text-tertiary)] opacity-45"
                }`}
              >
                <span className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? "text-white/75" : "text-[var(--lobb-text-secondary)]"}`}>{item.weekday}</span>
                <span className="text-xl font-black leading-none">{item.day}</span>
                {hasBookable && (
                  <span className={`mt-0.5 size-1.5 rounded-full ${isSelected ? "bg-white animate-pulse" : "bg-[var(--lobb-clay)]"}`} />
                )}
                {hasSlots && !hasBookable && (
                  <span className="mt-0.5 size-1.5 rounded-full bg-[var(--lobb-text-tertiary)]/40" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedGroup ? (
        <>
          <div className="mt-6 flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--lobb-text-primary)]">Pick a time</h3>
            <span className="rounded-full bg-[var(--lobb-clay-light)] px-2.5 py-1 text-xs font-bold text-[var(--lobb-clay)]">
              {selectedGroup.label}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {selectedGroup.slots.map((slot) => {
              const isActive   = selectedSlot === slot.iso;
              const isDisabled = slot.tooSoon;
              return (
                <button
                  key={slot.iso}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelectedSlot(slot.iso)}
                  title={isDisabled ? "Must be booked at least 24 hours in advance" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-[18px] border text-center transition-all duration-300 ${
                    isDisabled
                      ? "cursor-not-allowed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)]/60 opacity-40"
                      : isActive
                      ? "active:scale-95 border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white shadow-[0_14px_28px_rgba(196,98,45,0.22)] scale-[1.02]"
                      : "active:scale-95 border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] hover:border-[var(--lobb-clay)]/50"
                  }`}
                >
                  <span className="text-sm font-black">{slot.label}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-white/80" : "text-[var(--lobb-text-tertiary)]"}`}>
                    {isDisabled ? "24h advance" : "60 mins"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-center">
          {coachStatus && coachStatus !== "active" ? (
            <>
              <p className="text-sm font-black text-[var(--lobb-text-primary)]">
                {coachStatus === "pending" ? "Pending review" : "Not accepting bookings"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">
                This coach is currently under review and not yet accepting bookings.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-[var(--lobb-text-primary)]">No slots this week</p>
              <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">
                {weekStart === 0 ? "Try the next week →" : "No availability in the next 2 weeks"}
              </p>
            </>
          )}
        </div>
      )}

      {/* Info strip */}
      <div className="mt-5 rounded-[22px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 text-xs font-semibold text-[var(--lobb-text-secondary)] shadow-[var(--lobb-shadow-card)]">
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" /> Sessions are 60 minutes.
        </p>
        {selectedSlot && (
          <p className="mt-3 flex items-start gap-2 text-[var(--lobb-clay)]">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 animate-pulse text-[var(--lobb-clay)]" />
            <span>
              We will hold this slot for <strong>10 minutes</strong> once you continue.
            </span>
          </p>
        )}
      </div>

      <BookingButton disabled={!selectedSlot || locking} onClick={handleContinue}>
        {locking ? "Locking slot..." : "Continue"}
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
