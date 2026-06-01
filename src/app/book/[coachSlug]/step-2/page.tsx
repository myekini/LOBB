"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { MapPin, Timer } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import type { CoachPublicProfile } from "@/lib/types";
import { LAGOS_COURTS } from "@/lib/types";

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatSlotEndTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function countdownStyle(seconds: number) {
  if (seconds <= 120) return "bg-red-50 text-[var(--lobb-error)]";
  if (seconds <= 240) return "bg-[#fff7e0] text-[var(--lobb-warning)]";
  return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]";
}

function BookingStep2Content() {
  const params  = useParams<{ coachSlug: string }>();
  const search  = useSearchParams();
  const router  = useRouter();
  const slug    = params.coachSlug;

  const slot      = search.get("slot")    ?? "";
  const lockId    = search.get("lock")    ?? "";
  const expiresAt = search.get("expires") ?? "";

  const [coach,   setCoach]   = useState<CoachPublicProfile | null>(null);
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 10 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });
  const warnedRef = useRef(false);

  const [location, setLocation] = useState("");
  const [note,     setNote]     = useState("");

  useEffect(() => {
    if (!slot || !lockId || !expiresAt) router.replace(`/coaches/${slug}`);
  }, [slot, lockId, expiresAt, router, slug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/coaches/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { coach?: CoachPublicProfile } | null) => {
        if (!cancelled && payload?.coach) setCoach(payload.coach);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0) router.replace(`/coaches/${slug}?timeout=slot`);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [router, slug]);

  useEffect(() => {
    if (seconds <= 120 && seconds > 0 && !warnedRef.current) {
      warnedRef.current = true;
      showLobbToast({ type: "warning", message: "2 minutes left — complete your details." });
    }
  }, [seconds]);

  // Coach's preferred courts as quick-select chips
  const courtChips = useMemo(() => {
    if (!coach?.courts_worked_with?.length) return [];
    return coach.courts_worked_with
      .map((id) => LAGOS_COURTS.find((c) => c.id === id))
      .filter(Boolean) as typeof LAGOS_COURTS;
  }, [coach]);

  const handleContinue = () => {
    const params = new URLSearchParams({
      slot, lock: lockId, expires: expiresAt,
      location: location.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    router.push(`/book/${slug}/step-3?${params.toString()}`);
  };

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Slot recap */}
      {slot && (
        <div className="overflow-hidden rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)]">
          <div className="h-2 bg-[linear-gradient(90deg,var(--lobb-clay),var(--lobb-star))]" />
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Held slot</p>
                <p className="mt-1 text-base font-black text-[var(--lobb-text-primary)]">{formatSlotDate(slot)}</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                  {formatSlotTime(slot)} – {formatSlotEndTime(slot)} · 60 min
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${countdownStyle(seconds)}`}>
                <Timer className="size-3.5" />
                {formatCountdown(seconds)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Location input */}
      <div className="mt-4 rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
            <MapPin className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-black text-[var(--lobb-text-primary)]">Where will you play?</h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
              Enter the court name and area, or tap a suggestion below.
            </p>
          </div>
        </div>

        <textarea
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Lekki Tennis Club, Lekki Phase 1"
          rows={2}
          className="mt-4 w-full resize-none rounded-[20px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-semibold outline-none shadow-sm transition-all duration-200 placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
        />

        {/* Coach court chips */}
        {courtChips.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
              Courts this coach works with
            </p>
            <div className="flex flex-wrap gap-2">
              {courtChips.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => setLocation(`${court.name}, ${court.area}`)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition-all duration-150 active:scale-95 ${
                    location === `${court.name}, ${court.area}`
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {court.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Note to coach */}
      <label className="mt-4 block rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)] sm:p-5">
        <span className="text-sm font-black uppercase tracking-wider text-[var(--lobb-text-primary)]">
          Note to coach{" "}
          <span className="text-[10px] font-bold tracking-normal text-[var(--lobb-text-secondary)] lowercase">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Focus area, injury note, or anything the coach should know"
          rows={3}
          className="mt-3 h-24 w-full resize-none rounded-[20px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-semibold outline-none shadow-sm transition-all duration-200 placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
        />
      </label>

      <BookingButton disabled={!location.trim()} onClick={handleContinue}>
        Review booking
      </BookingButton>
    </BookingShell>
  );
}

export default function BookingStepTwoPage() {
  return (
    <Suspense fallback={null}>
      <BookingStep2Content />
    </Suspense>
  );
}
