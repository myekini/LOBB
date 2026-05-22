"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Timer, HelpCircle } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import type { CoachPublicProfile } from "@/lib/types";

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
  return "bg-[#fff0e8] text-[var(--lobb-clay)]";
}

function BookingStep2Content() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug   = params.coachSlug;

  const slot      = search.get("slot")    ?? "";
  const lockId    = search.get("lock")    ?? "";
  const expiresAt = search.get("expires") ?? "";

  const [coach,   setCoach]   = useState<CoachPublicProfile | null>(null);
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 10 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  const warnedRef = useRef(false);

  // Advanced structured court options
  const [courtOption, setCourtOption] = useState<"coach_provided" | "coach_recommend" | "player_provided">("player_provided");
  const [selectedArea, setSelectedArea] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!slot || !lockId || !expiresAt) router.replace(`/coaches/${slug}`);
  }, [slot, lockId, expiresAt, router, slug]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/coaches/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { coach?: CoachPublicProfile } | null) => {
        if (!cancelled && payload?.coach) {
          const c = payload.coach;
          setCoach(c);

          // Set default option based on coach availability and court access settings
          if (c.court_access === "coach_has_access") {
            setCourtOption("coach_provided");
          } else if (c.court_access === "coach_can_recommend") {
            setCourtOption("coach_recommend");
          } else {
            setCourtOption("player_provided");
          }

          // Set default area to primary location
          const primaryLoc = c.primary_location || c.service_areas[0] || "";
          setSelectedArea(primaryLoc);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
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

  // Compute unique locations covered by the coach
  const coachLocations = useMemo(() => {
    if (!coach) return [];
    const list = [coach.primary_location, ...coach.service_areas].filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [coach]);

  // Compile final court string
  const finalCourtString = useMemo(() => {
    if (courtOption === "coach_provided") {
      return `Coach-provided court in ${selectedArea}`;
    }
    if (courtOption === "coach_recommend") {
      return `Coach to recommend a court near ${selectedArea}`;
    }
    return `${customAddress.trim()}${selectedArea ? ` (${selectedArea})` : ""}`;
  }, [courtOption, selectedArea, customAddress]);

  const isContinueDisabled = useMemo(() => {
    if (courtOption === "player_provided" && customAddress.trim().length === 0) {
      return true;
    }
    if (!selectedArea) {
      return true;
    }
    return false;
  }, [courtOption, selectedArea, customAddress]);

  const handleContinue = () => {
    router.push(
      `/book/${slug}/step-3?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}&location=${encodeURIComponent(finalCourtString)}&note=${encodeURIComponent(note.trim())}`
    );
  };

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Compact slot recap */}
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

      {/* Where to play */}
      <div className="mt-6">
        <span className="flex items-center gap-2 text-sm font-black text-[var(--lobb-black)] uppercase tracking-wider">
          <MapPin className="size-4 text-[var(--lobb-clay)]" />
          Where will you play? <span className="text-[var(--lobb-error)]">*</span>
        </span>

        {coach && (
          <div className="mt-3 space-y-4">
            {/* Strategy Toggles */}
            <div className="grid gap-2.5">
              {coach.court_access === "coach_has_access" && (
                <button
                  type="button"
                  onClick={() => setCourtOption("coach_provided")}
                  className={`rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                    courtOption === "coach_provided"
                      ? "border-[var(--lobb-clay)] bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.03] text-[var(--lobb-black)] shadow-[0_12px_32px_rgba(196,98,45,0.06)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/30 hover:bg-white text-[var(--lobb-black)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`size-4.5 transition-colors duration-300 ${courtOption === "coach_provided" ? "text-[var(--lobb-clay)]" : "text-transparent border border-[var(--lobb-border)] rounded-full bg-white"}`} />
                    <span className="text-sm font-black">Use coach-provided court</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--lobb-muted)]">
                    {coach.full_name} will arrange the court in their operating area. Exact club/venue confirmed post-booking.
                  </p>
                </button>
              )}

              {coach.court_access === "coach_can_recommend" && (
                <button
                  type="button"
                  onClick={() => setCourtOption("coach_recommend")}
                  className={`rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                    courtOption === "coach_recommend"
                      ? "border-[var(--lobb-clay)] bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.03] text-[var(--lobb-black)] shadow-[0_12px_32px_rgba(196,98,45,0.06)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/30 hover:bg-white text-[var(--lobb-black)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`size-4.5 transition-colors duration-300 ${courtOption === "coach_recommend" ? "text-[var(--lobb-clay)]" : "text-transparent border border-[var(--lobb-border)] rounded-full bg-white"}`} />
                    <span className="text-sm font-black">Let coach recommend a court</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--lobb-muted)]">
                    {coach.full_name} will suggest a suitable court nearby.
                  </p>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCourtOption("player_provided")}
                className={`rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                  courtOption === "player_provided"
                    ? "border-[var(--lobb-clay)] bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.03] text-[var(--lobb-black)] shadow-[0_12px_32px_rgba(196,98,45,0.06)]"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/30 hover:bg-white text-[var(--lobb-black)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`size-4.5 transition-colors duration-300 ${courtOption === "player_provided" ? "text-[var(--lobb-clay)]" : "text-transparent border border-[var(--lobb-border)] rounded-full bg-white"}`} />
                  <span className="text-sm font-black">I will arrange the court</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--lobb-muted)]">
                  You provide the venue (your club, estate, or booked court) and the coach meets you there.
                </p>
              </button>
            </div>

            {/* Selection Grid for Coach Locations */}
            <div className="rounded-[24px] border border-[var(--lobb-border)] bg-gradient-to-b from-white to-[var(--lobb-surface)] p-5 animate-in fade-in-50 duration-300 shadow-sm">
              <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--lobb-clay)] mb-3">
                {courtOption === "player_provided"
                  ? "Select travel area for the coach:"
                  : "Select court location area:"}
              </span>

              <div className="flex flex-wrap gap-2">
                {coachLocations.map((loc) => {
                  const isSelected = selectedArea === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setSelectedArea(loc)}
                      className={`rounded-full px-4 py-2 text-xs font-black transition-all duration-300 active:scale-[0.96] ${
                        isSelected
                          ? "bg-[var(--lobb-clay)] text-white shadow-[0_6px_14px_rgba(196,98,45,0.2)] scale-105"
                          : "border border-[var(--lobb-border)] bg-white text-[var(--lobb-black)] hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-surface)]"
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>

              {courtOption === "player_provided" && (
                <div className="mt-4 pt-4 border-t border-[var(--lobb-border)] animate-in fade-in-0 duration-300">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--lobb-clay)] mb-2">
                    Enter exact court name or address: <span className="text-[var(--lobb-error)]">*</span>
                  </span>
                  <textarea
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="e.g. Lagos Country Club Court 2, Lekki Phase 1 Tennis Club, or estate name..."
                    rows={2}
                    className="w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-white p-3 text-sm font-semibold outline-none placeholder:text-[#b4ad9e] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10 shadow-sm transition-all duration-200"
                  />
                </div>
              )}
            </div>
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

      {/* Structured dynamic message display */}
      <div className="mt-5 rounded-2xl bg-[var(--lobb-clay)]/[0.03] p-4 border border-[var(--lobb-clay)]/10 animate-in fade-in-50 duration-300">
        <div className="flex gap-3 items-start">
          <HelpCircle className="size-5 text-[var(--lobb-clay)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-[var(--lobb-black)] uppercase tracking-wider">Selected Location Summary</p>
            <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)] italic leading-relaxed">
              &ldquo;{finalCourtString || "Please complete court selections above"}&rdquo;
            </p>
          </div>
        </div>
      </div>

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
