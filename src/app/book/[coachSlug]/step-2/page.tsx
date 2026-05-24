"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Info, Lock, MapPin, Timer, Users } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import type { CoachPublicProfile } from "@/lib/types";
import { LAGOS_COURTS, NATIONAL_STADIUM_COURTS } from "@/lib/types";

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

function isWeekday(iso: string) {
  const day = new Date(iso).getDay(); // 0=Sun, 6=Sat
  return day >= 1 && day <= 5;
}

function slotHour(iso: string) {
  return new Date(iso).getHours();
}

function isMemberCourtPubliclyAccessible(iso: string) {
  return isWeekday(iso) && slotHour(iso) < 16;
}

type CourtPickerMode = "curated" | "custom";

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

  // Location state
  const [mode, setMode]                     = useState<CourtPickerMode>("curated");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedStadiumCourtId, setSelectedStadiumCourtId] = useState<string>("");
  const [customAddress, setCustomAddress]   = useState("");
  const [note, setNote]                     = useState("");

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

  // Filter courts to the coach's service areas
  const relevantCourts = useMemo(() => {
    if (!coach) return LAGOS_COURTS;
    const coachAreas = [coach.primary_location, ...coach.service_areas].filter(Boolean).map((a) => a!.toLowerCase());
    if (coachAreas.length === 0) return LAGOS_COURTS;
    return LAGOS_COURTS.filter((c) => coachAreas.some((a) => c.area.toLowerCase().includes(a) || a.includes(c.area.toLowerCase())));
  }, [coach]);

  const selectedCourt = useMemo(() => LAGOS_COURTS.find((c) => c.id === selectedCourtId) ?? null, [selectedCourtId]);

  const isNatStadiumSelected = selectedCourtId === "national_stadium";

  // National Stadium member court accessibility for the selected slot
  const memberCourtsAccessible = useMemo(() => isMemberCourtPubliclyAccessible(slot), [slot]);
  const isWeekendSlot = useMemo(() => !isWeekday(slot), [slot]);

  // Compile final location string
  const finalLocation = useMemo(() => {
    if (mode === "custom") return customAddress.trim();
    if (!selectedCourt) return "";
    if (isNatStadiumSelected && selectedStadiumCourtId) {
      const sc = NATIONAL_STADIUM_COURTS.find((c) => c.id === selectedStadiumCourtId);
      return sc ? `${sc.label} — National Stadium, Surulere` : `National Stadium Tennis Courts, Surulere`;
    }
    return `${selectedCourt.name}, ${selectedCourt.area}`;
  }, [mode, customAddress, selectedCourt, isNatStadiumSelected, selectedStadiumCourtId]);

  const isContinueDisabled = useMemo(() => {
    if (mode === "custom") return customAddress.trim().length === 0;
    if (!selectedCourtId) return true;
    if (isNatStadiumSelected && !selectedStadiumCourtId) return true;
    return false;
  }, [mode, customAddress, selectedCourtId, isNatStadiumSelected, selectedStadiumCourtId]);

  const handleContinue = () => {
    const venueId  = mode === "curated" && selectedCourtId ? selectedCourtId : "";
    const courtId  = isNatStadiumSelected ? selectedStadiumCourtId : "";
    const params = new URLSearchParams({
      slot, lock: lockId, expires: expiresAt,
      location: finalLocation,
      note: note.trim(),
      ...(venueId  ? { venue_id: venueId }   : {}),
      ...(courtId  ? { court_id: courtId }   : {}),
    });
    router.push(`/book/${slug}/step-3?${params.toString()}`);
  };

  const courtsToShow = relevantCourts.length > 0 ? relevantCourts : LAGOS_COURTS;

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Slot recap */}
      {slot && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold animate-in fade-in-0 slide-in-from-top-1 duration-300">
            <CalendarDays className="size-3.5 text-[var(--lobb-clay)]" />
            {formatSlotDate(slot)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold animate-in fade-in-0 slide-in-from-top-1 duration-300 delay-75">
            <Clock3 className="size-3.5 text-[var(--lobb-clay)]" />
            {formatSlotTime(slot)} – {formatSlotEndTime(slot)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold animate-in fade-in-0 slide-in-from-top-1 duration-300 delay-150">
            <Timer className="size-3.5 text-[var(--lobb-clay)]" />
            60 min
          </span>
        </div>
      )}

      {/* Countdown */}
      <p className={`mt-4 rounded-full px-4 py-2 text-center text-sm font-black transition-colors duration-500 ${countdownStyle(seconds)}`}>
        {formatCountdown(seconds)} remaining
      </p>

      {/* Location header */}
      <div className="mt-6">
        <span className="flex items-center gap-2 text-sm font-black text-[var(--lobb-black)] uppercase tracking-wider">
          <MapPin className="size-4 text-[var(--lobb-clay)]" />
          Where will you play? <span className="text-[var(--lobb-error)]">*</span>
        </span>

        {/* Mode toggle */}
        <div className="mt-3 flex gap-2 rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1.5">
          <button
            type="button"
            onClick={() => setMode("curated")}
            className={`flex-1 rounded-xl py-2 text-xs font-black transition-all duration-200 ${
              mode === "curated" ? "bg-white shadow-sm text-[var(--lobb-clay)]" : "text-[var(--lobb-muted)]"
            }`}
          >
            Choose a court
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`flex-1 rounded-xl py-2 text-xs font-black transition-all duration-200 ${
              mode === "custom" ? "bg-white shadow-sm text-[var(--lobb-clay)]" : "text-[var(--lobb-muted)]"
            }`}
          >
            Enter address
          </button>
        </div>

        {/* Curated court picker */}
        {mode === "curated" && (
          <div className="mt-3 space-y-2.5 animate-in fade-in-0 duration-200">
            {courtsToShow.map((court) => {
              const isSelected = selectedCourtId === court.id;
              const isLocked = court.accessRule === "members_only";
              return (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) return;
                    setSelectedCourtId(court.id);
                    setSelectedStadiumCourtId(""); // reset stadium sub-court on change
                  }}
                  disabled={isLocked}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                    isLocked
                      ? "opacity-50 cursor-not-allowed border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
                      : isSelected
                      ? "border-[var(--lobb-clay)] bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.03] shadow-[0_8px_24px_rgba(196,98,45,0.07)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/30 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2
                        className={`size-4.5 shrink-0 transition-colors ${
                          isSelected ? "text-[var(--lobb-clay)]" : "text-transparent"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{court.name}</p>
                        <p className="text-xs font-semibold text-[var(--lobb-muted)]">{court.area} · {court.courtCount ?? "?"} courts</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {court.isNationalStadium && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                          GRANOLA
                        </span>
                      )}
                      {isLocked && <Lock className="size-3.5 text-[var(--lobb-muted)]" />}
                      {court.accessRule === "members_weekday_restricted" && (
                        <Users className="size-3.5 text-amber-600" />
                      )}
                    </div>
                  </div>
                  {court.publicNote && !isLocked && (
                    <p className="mt-1.5 ml-6 text-xs font-semibold text-[var(--lobb-muted)] leading-relaxed">
                      {court.publicNote}
                    </p>
                  )}
                  {isLocked && (
                    <p className="mt-1.5 ml-6 text-xs font-semibold text-[var(--lobb-muted)]">
                      Members and guests only
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom address input */}
        {mode === "custom" && (
          <div className="mt-3 animate-in fade-in-0 duration-200">
            <textarea
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              placeholder="e.g. Lekki Phase 1 Tennis Club, Court 2, Lagos"
              rows={3}
              className="w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-white p-4 text-sm font-semibold outline-none placeholder:text-[#b4ad9e] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10 shadow-sm transition-all duration-200"
            />
          </div>
        )}

        {/* National Stadium granola sub-picker */}
        {mode === "curated" && isNatStadiumSelected && (
          <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/60 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Select a specific court</p>
            </div>

            {/* Saturday / peak warning */}
            {isWeekendSlot && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2.5 flex items-start gap-2">
                <Info className="size-4 shrink-0 text-amber-700 mt-0.5" />
                <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                  Saturday mornings are peak hours at National Stadium. Courts fill quickly — sessions are strictly 60 minutes. The venue typically clears by 12pm when the sun becomes intense.
                </p>
              </div>
            )}

            {/* Section: Front courts (members) */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
                Front Courts — Members
                {memberCourtsAccessible ? (
                  <span className="ml-2 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 normal-case tracking-normal font-black">Open now</span>
                ) : (
                  <span className="ml-2 rounded-full bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 normal-case tracking-normal font-semibold">
                    {isWeekendSlot ? "Closed weekends" : "Closed after 4pm"}
                  </span>
                )}
              </p>
              <div className="space-y-1.5">
                {NATIONAL_STADIUM_COURTS.filter((c) => c.isMemberCourt).map((sc) => {
                  const isLocked = !memberCourtsAccessible;
                  const isSelected = selectedStadiumCourtId === sc.id;
                  return (
                    <button key={sc.id} type="button" disabled={isLocked}
                      onClick={() => { if (!isLocked) setSelectedStadiumCourtId(sc.id); }}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                        isLocked ? "opacity-40 cursor-not-allowed border-amber-200 bg-white/40"
                          : isSelected ? "border-amber-400 bg-white shadow-sm"
                          : "border-amber-200 bg-white hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 shrink-0 ${isSelected ? "text-amber-600" : "text-transparent"}`} />
                        <span className="text-sm font-black">{sc.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: Center court */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">Center Court</p>
              {NATIONAL_STADIUM_COURTS.filter((c) => c.id === "nat_center").map((sc) => {
                const isSelected = selectedStadiumCourtId === sc.id;
                return (
                  <button key={sc.id} type="button" onClick={() => setSelectedStadiumCourtId(sc.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                      isSelected ? "border-amber-400 bg-white shadow-sm" : "border-amber-200 bg-white hover:border-amber-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`size-4 shrink-0 ${isSelected ? "text-amber-600" : "text-transparent"}`} />
                      <span className="text-sm font-black">{sc.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Section: Back courts */}
            <div>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700">Back Courts</p>
              <div className="space-y-1.5">
                {NATIONAL_STADIUM_COURTS.filter((c) => c.id.startsWith("nat_back")).map((sc) => {
                  const isSelected = selectedStadiumCourtId === sc.id;
                  return (
                    <button key={sc.id} type="button" onClick={() => setSelectedStadiumCourtId(sc.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                        isSelected ? "border-amber-400 bg-white shadow-sm" : "border-amber-200 bg-white hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 shrink-0 ${isSelected ? "text-amber-600" : "text-transparent"}`} />
                        <span className="text-sm font-black">{sc.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-[10px] font-semibold text-amber-700 leading-relaxed">
              Sessions are 60 minutes. Coaches must clear the court on time. Arriving with multiple clients per session is not permitted — LOBB bookings are 1-on-1.
            </p>
          </div>
        )}
      </div>

      {/* Note to coach */}
      <label className="mt-6 block">
        <span className="text-sm font-black text-[var(--lobb-black)] uppercase tracking-wider">
          Note to coach{" "}
          <span className="text-[10px] font-bold text-[var(--lobb-muted)] tracking-normal lowercase">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I'm a complete beginner / focus on my backhand / bring spare balls"
          rows={3}
          className="mt-2 h-24 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10 shadow-sm transition-all duration-200"
        />
      </label>

      {/* Location preview */}
      {finalLocation && (
        <div className="mt-5 rounded-2xl bg-[var(--lobb-clay)]/[0.03] p-4 border border-[var(--lobb-clay)]/10 animate-in fade-in-50 duration-300">
          <div className="flex gap-3 items-start">
            <MapPin className="size-4 text-[var(--lobb-clay)] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-[var(--lobb-black)] uppercase tracking-wider">Location confirmed</p>
              <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)] italic leading-relaxed">
                &ldquo;{finalLocation}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      <BookingButton disabled={isContinueDisabled} onClick={handleContinue}>
        Continue to Review & Pay →
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
