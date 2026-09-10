"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Textarea as LobbTextarea } from "@/components/ui/textarea";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { MapPin, PenLine, Timer } from "lucide-react";
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
  if (seconds <= 120) return "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]";
  if (seconds <= 240) return "bg-[var(--lobb-warning)]/10 text-[var(--lobb-warning)]";
  return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]";
}

function AccessBadge({ rule }: { rule: string }) {
  if (rule === "open") {
    return (
      <span className="text-xs font-medium text-[var(--lobb-success)]">
        Open access
      </span>
    );
  }
  if (rule === "members_only") {
    return (
      <span className="text-xs font-medium text-[var(--lobb-text-secondary)]">
        Members only
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-[var(--lobb-text-secondary)]">
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
  const courtAccess = coach?.court_access;

  // court_access shapes the guidance: coaches who provide courts lead with
  // their courts; player_arranges coaches make clear the venue is on the player.
  const courtHeader = hasCoachCourts
    ? "Coach's session courts"
    : courtAccess === "player_arranges"
    ? "Choose your court"
    : "Where will you play?";
  const courtSubcopy = hasCoachCourts
    ? "Select a court your coach holds sessions at."
    : courtAccess === "player_arranges"
    ? "This coach travels to you — pick a court you have access to, or enter your own venue below."
    : courtAccess === "coach_can_recommend"
    ? "Pick a court, or ask your coach for a recommendation after booking."
    : "Tap a court to confirm your session venue.";

  const canContinue = showCustom
    ? customLocation.trim().length > 0
    : selectedCourtId !== null;

  const handleSelectCourt = (courtId: string) => {
    setSelectedCourtId(courtId);
    setShowCustom(false);
    setCustomLocation("");
  };

  const handleShowCustom = () => {
    setShowCustom(true);
    setSelectedCourtId(null);
  };

  const handleContinue = () => {
    let locationText = "";
    let courtId      = "";

    if (showCustom) {
      locationText = customLocation.trim();
    } else {
      const court = courtOptions.find((c) => c.id === selectedCourtId);
      if (court) {
        locationText = `${court.name}, ${court.area}`;
        courtId      = court.id;
      }
    }

    const urlParams = new URLSearchParams({
      slot, lock: lockId, expires: expiresAt,
      location: locationText,
      ...(courtId    ? { court_id: courtId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    router.push(`/book/${slug}/step-3?${urlParams.toString()}`);
  };

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Slot recap */}
      {slot && (
        <div className="lobb-surface-outlined overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--lobb-text-secondary)]">Time held for checkout</p>
                <p className="mt-1 text-base font-medium text-[var(--lobb-text-primary)]">{formatSlotDate(slot)}</p>
                <p className="mt-0.5 text-sm font-medium text-[var(--lobb-text-secondary)]">
                  {formatSlotTime(slot)} to {formatSlotEndTime(slot)}, 60 min
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--lobb-radius-md)] px-3 py-2 text-xs font-medium tabular-nums ${countdownStyle(seconds)}`}>
                <Timer className="size-3.5" />
                {formatCountdown(seconds)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Court picker */}
      <div className="lobb-surface-outlined mt-4 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-[var(--lobb-border-subtle)] p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
            <MapPin className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--lobb-text-primary)]">
              {courtHeader}
            </h2>
            <p className="mt-0.5 text-sm font-medium leading-snug text-[var(--lobb-text-secondary)]">
              {courtSubcopy}
            </p>
          </div>
        </div>

        {/* Court list */}
        <div role="radiogroup" aria-label="Choose a court" className="space-y-2 p-4 sm:p-5">
          {courtOptions.map((court) => (
            <div key={court.id}>
              <LobbButton variant="unstyled"
                type="button"
                role="radio"
                aria-checked={selectedCourtId === court.id && !showCustom}
                onClick={() => handleSelectCourt(court.id)}
                className={`h-auto min-h-[76px] w-full whitespace-normal rounded-[var(--lobb-radius-lg)] border p-4 text-left transition-[background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99] ${
                  selectedCourtId === court.id && !showCustom
                    ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] ring-1 ring-[var(--lobb-clay)]"
                    : "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] hover:border-[var(--lobb-clay)]/40"
                }`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_24px] items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium leading-tight ${
                      selectedCourtId === court.id && !showCustom
                        ? "text-[var(--lobb-clay)]"
                        : "text-[var(--lobb-text-primary)]"
                    }`}>
                      {court.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">
                      {court.area}
                      {court.courtCount ? ` · ${court.courtCount} court${court.courtCount > 1 ? "s" : ""}` : ""}
                    </p>
                    <div className="mt-1.5"><AccessBadge rule={court.accessRule} /></div>
                    {court.publicNote && selectedCourtId === court.id && !showCustom && (
                      <p className="mt-2 border-t border-[var(--lobb-border-subtle)] pt-2 text-[11px] leading-snug text-[var(--lobb-text-tertiary)]">
                        {court.publicNote}
                      </p>
                    )}
                  </div>
                  <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${selectedCourtId === court.id && !showCustom ? "border-[var(--lobb-clay)]" : "border-[var(--lobb-border-strong)]"}`}>
                    {selectedCourtId === court.id && !showCustom && <span className="size-2.5 rounded-full bg-[var(--lobb-clay)]" />}
                  </span>
                </div>
              </LobbButton>

            </div>
          ))}

          <div className="flex items-center gap-3 py-2"><span className="h-px flex-1 bg-[var(--lobb-border-subtle)]" /><span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">Or</span><span className="h-px flex-1 bg-[var(--lobb-border-subtle)]" /></div>

          {/* Other / custom location */}
          {showCustom ? (
            <div className="rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-strong)] bg-[var(--lobb-bg-primary)] p-4">
              <p className="mb-2 text-sm font-medium text-[var(--lobb-text-primary)]">
                Enter another location
              </p>
              <LobbTextarea
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g. Lekki Tennis Club, Lekki Phase 1"
                rows={2}
                autoFocus
                className="w-full resize-none bg-[var(--lobb-bg-elevated)]"
              />
              <LobbButton variant="unstyled"
                type="button"
                onClick={() => { setShowCustom(false); setCustomLocation(""); }}
                className="mt-2 text-xs font-medium text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)]"
              >
                ← Cancel
              </LobbButton>
            </div>
          ) : (
            <LobbButton variant="unstyled"
              type="button"
              onClick={handleShowCustom}
              className="flex h-auto min-h-14 w-full items-center gap-2.5 rounded-[var(--lobb-radius-lg)] border border-dashed border-[var(--lobb-border-subtle)] p-4 text-left transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-[var(--lobb-clay)]/40 active:scale-[0.99]"
            >
              <PenLine className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
              <span className="text-sm font-medium text-[var(--lobb-text-secondary)]">Other location</span>
            </LobbButton>
          )}
        </div>
      </div>

      {/* Note to coach */}
      <label className="lobb-surface-outlined mt-4 block border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
        <span className="text-sm font-medium text-[var(--lobb-text-primary)]">
          Note to coach <span className="font-normal text-[var(--lobb-text-secondary)]">(optional)</span>
        </span>
        <LobbTextarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Focus area, injury note, or anything the coach should know"
          rows={3}
          className="mt-3 h-24 resize-none bg-[var(--lobb-bg-primary)]"
        />
      </label>

      <BookingButton disabled={!canContinue} onClick={handleContinue}>
        Continue to review
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
