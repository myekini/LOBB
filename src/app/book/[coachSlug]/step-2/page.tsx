"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { CheckCircle2, MapPin, PenLine, Timer } from "lucide-react";
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
  if (seconds <= 120) return "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]";
  if (seconds <= 240) return "bg-[var(--lobb-warning)]/10 text-[var(--lobb-warning)]";
  return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]";
}

function AccessBadge({ rule }: { rule: string }) {
  if (rule === "open") {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--lobb-success-soft)] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--lobb-success)]">
        Open access
      </span>
    );
  }
  if (rule === "members_only") {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--lobb-clay-light)] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--lobb-clay)]">
        Members only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-blue-600">
      Restricted hours
    </span>
  );
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

  const [selectedCourtId,    setSelectedCourtId]    = useState<string | null>(null);
  const [selectedSubCourtId, setSelectedSubCourtId] = useState<string | null>(null);
  const [showCustom,         setShowCustom]         = useState(false);
  const [customLocation,     setCustomLocation]     = useState("");
  const [note,               setNote]               = useState("");

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
      showLobbToast({ type: "warning", message: "2 minutes left. Complete your details." });
    }
  }, [seconds]);

  // Courts to show: coach's session courts if set, otherwise all LAGOS_COURTS
  const courtOptions = useMemo(() => {
    const assigned = coach?.courts_worked_with ?? [];
    if (assigned.length > 0) {
      return assigned
        .map((id) => LAGOS_COURTS.find((c) => c.id === id))
        .filter(Boolean) as typeof LAGOS_COURTS;
    }
    return LAGOS_COURTS;
  }, [coach]);

  const hasCoachCourts = Boolean(coach?.courts_worked_with?.length);
  const isNatStadium   = selectedCourtId === "national_stadium";

  const canContinue = showCustom
    ? customLocation.trim().length > 0
    : selectedCourtId !== null && (!isNatStadium || selectedSubCourtId !== null);

  const handleSelectCourt = (courtId: string) => {
    setSelectedCourtId(courtId);
    setSelectedSubCourtId(null);
    setShowCustom(false);
    setCustomLocation("");
  };

  const handleShowCustom = () => {
    setShowCustom(true);
    setSelectedCourtId(null);
    setSelectedSubCourtId(null);
  };

  const handleContinue = () => {
    let locationText = "";
    let courtId      = "";
    let subCourtId   = "";

    if (showCustom) {
      locationText = customLocation.trim();
    } else {
      const court = courtOptions.find((c) => c.id === selectedCourtId);
      if (court) {
        if (isNatStadium && selectedSubCourtId) {
          const sub = NATIONAL_STADIUM_COURTS.find((c) => c.id === selectedSubCourtId);
          locationText = sub
            ? `${sub.label}, National Stadium, Surulere`
            : `${court.name}, ${court.area}`;
        } else {
          locationText = `${court.name}, ${court.area}`;
        }
        courtId    = court.id;
        subCourtId = selectedSubCourtId ?? "";
      }
    }

    const urlParams = new URLSearchParams({
      slot, lock: lockId, expires: expiresAt,
      location: locationText,
      ...(courtId    ? { court_id:  courtId    } : {}),
      ...(subCourtId ? { sub_court: subCourtId } : {}),
      ...(note.trim() ? { note: note.trim() }    : {}),
    });
    router.push(`/book/${slug}/step-3?${urlParams.toString()}`);
  };

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Slot recap */}
      {slot && (
        <div className="lobb-app-card overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Held slot</p>
                <p className="mt-1 text-base font-black text-[var(--lobb-text-primary)]">{formatSlotDate(slot)}</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                  {formatSlotTime(slot)} to {formatSlotEndTime(slot)}, 60 min
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

      {/* Court picker */}
      <div className="lobb-app-card mt-4 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[var(--lobb-border-subtle)] p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
            <MapPin className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-black text-[var(--lobb-text-primary)]">
              {hasCoachCourts ? "Coach's session courts" : "Where will you play?"}
            </h2>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-[var(--lobb-text-secondary)]">
              {hasCoachCourts
                ? "Select a court your coach holds sessions at."
                : "Tap a court to confirm your session venue."}
            </p>
          </div>
        </div>

        {/* Court list */}
        <div className="space-y-2 p-4 sm:p-5">
          {courtOptions.map((court) => (
            <div key={court.id}>
              <button
                type="button"
                onClick={() => handleSelectCourt(court.id)}
                className={`w-full rounded-[14px] border p-4 text-left transition-all duration-150 active:scale-[0.99] ${
                  selectedCourtId === court.id && !showCustom
                    ? "border-2 border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)]"
                    : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-black leading-tight ${
                      selectedCourtId === court.id && !showCustom
                        ? "text-[var(--lobb-clay)]"
                        : "text-[var(--lobb-text-primary)]"
                    }`}>
                      {court.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--lobb-text-secondary)]">
                      {court.area}
                      {court.courtCount ? ` · ${court.courtCount} court${court.courtCount > 1 ? "s" : ""}` : ""}
                    </p>
                    {court.publicNote && (
                      <p className="mt-1 text-[11px] leading-snug text-[var(--lobb-text-tertiary)]">
                        {court.publicNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <AccessBadge rule={court.accessRule} />
                    {selectedCourtId === court.id && !showCustom && (
                      <CheckCircle2 className="size-5 text-[var(--lobb-clay)]" />
                    )}
                  </div>
                </div>
              </button>

              {/* National Stadium sub-court picker — appears inline after the card */}
              {court.isNationalStadium && selectedCourtId === court.id && !showCustom && (
                <div className="mt-2 rounded-[12px] border border-[var(--lobb-clay)]/25 bg-[var(--lobb-clay-light)]/40 p-3">
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                    Pick a specific court
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {NATIONAL_STADIUM_COURTS.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubCourtId(sub.id)}
                        className={`rounded-[10px] border px-2 py-2.5 text-center transition-all duration-150 active:scale-95 ${
                          selectedSubCourtId === sub.id
                            ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
                            : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] hover:border-[var(--lobb-clay)]/50"
                        }`}
                      >
                        <span className="block text-xs font-black leading-tight">{sub.label}</span>
                        {sub.isMemberCourt && (
                          <span className={`mt-0.5 block text-[9px] font-semibold ${
                            selectedSubCourtId === sub.id ? "text-white/75" : "text-[var(--lobb-text-tertiary)]"
                          }`}>
                            Members
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Other / custom location */}
          {showCustom ? (
            <div className="rounded-[14px] border-2 border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[var(--lobb-clay)]">
                Custom location
              </p>
              <textarea
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g. Lekki Tennis Club, Lekki Phase 1"
                rows={2}
                autoFocus
                className="w-full resize-none rounded-[10px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
              />
              <button
                type="button"
                onClick={() => { setShowCustom(false); setCustomLocation(""); }}
                className="mt-2 text-xs font-black text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)]"
              >
                ← Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleShowCustom}
              className="flex w-full items-center gap-2.5 rounded-[14px] border border-dashed border-[var(--lobb-border-subtle)] p-4 text-left transition-all duration-150 hover:border-[var(--lobb-clay)]/40 active:scale-[0.99]"
            >
              <PenLine className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
              <span className="text-sm font-black text-[var(--lobb-text-secondary)]">Other location</span>
            </button>
          )}
        </div>
      </div>

      {/* Note to coach */}
      <label className="lobb-app-card mt-4 block border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
        <span className="text-sm font-black uppercase tracking-wider text-[var(--lobb-text-primary)]">
          Note to coach{" "}
          <span className="text-[10px] font-bold tracking-normal text-[var(--lobb-text-secondary)] lowercase">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Focus area, injury note, or anything the coach should know"
          rows={3}
          className="mt-3 h-24 w-full resize-none rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
        />
      </label>

      <BookingButton disabled={!canContinue} onClick={handleContinue}>
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
