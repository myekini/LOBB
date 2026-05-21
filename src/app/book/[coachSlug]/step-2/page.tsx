"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Timer } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { showLobbToast } from "@/components/lobb-global-state";
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

function getCourtSuggestions(coach: CoachPublicProfile | null) {
  if (!coach) return [];

  const area = coach.primary_location || coach.service_areas[0] || "Lagos";

  if (coach.court_access === "coach_has_access") {
    return [
      {
        title: "Coach-provided court",
        value: `Coach-provided court around ${area}`,
        note: `${coach.full_name} has court access. You can confirm exact details after booking.`,
      },
    ];
  }

  if (coach.court_access === "coach_can_recommend") {
    return [
      {
        title: "Let the coach recommend",
        value: `Coach to recommend a court around ${area}`,
        note: `${coach.full_name} can suggest a suitable court near ${area}.`,
      },
    ];
  }

  return [
    {
      title: "I will arrange the court",
      value: "",
      note: "Add the club, estate, or court address so the coach knows where to meet you.",
    },
  ];
}

function BookingStep2Content() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug   = params.coachSlug;

  const slot      = search.get("slot")    ?? "";
  const lockId    = search.get("lock")    ?? "";
  const expiresAt = search.get("expires") ?? "";

  const [court,   setCourt]   = useState("");
  const [note,    setNote]    = useState("");
  const [coach,   setCoach]   = useState<CoachPublicProfile | null>(null);
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 10 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  const warnedRef = useRef(false);
  const courtTouchedRef = useRef(false);

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

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const [suggestion] = getCourtSuggestions(coach);
    if (suggestion?.value && !courtTouchedRef.current && !court) {
      setCourt(suggestion.value);
    }
  }, [coach, court]);

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

  const handleContinue = () => {
    router.push(
      `/book/${slug}/step-3?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}&location=${encodeURIComponent(court.trim())}&note=${encodeURIComponent(note.trim())}`
    );
  };

  const courtSuggestions = getCourtSuggestions(coach);

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Compact slot recap */}
      {slot && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold">
            <CalendarDays className="size-3.5 text-[var(--lobb-clay)]" />
            {formatSlotDate(slot)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold">
            <Clock3 className="size-3.5 text-[var(--lobb-clay)]" />
            {formatSlotTime(slot)} – {formatSlotEndTime(slot)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 text-xs font-bold">
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
      <label className="mt-6 block">
        <span className="flex items-center gap-2 text-sm font-black">
          <MapPin className="size-4 text-[var(--lobb-clay)]" />
          Where will you play? <span className="text-[var(--lobb-error)]">*</span>
        </span>
        {courtSuggestions.length > 0 && (
          <div className="mt-3 grid gap-2">
            {courtSuggestions.map((suggestion) => {
              const selected = suggestion.value ? court === suggestion.value : court.trim().length === 0;
              return (
                <button
                  key={suggestion.title}
                  type="button"
                  onClick={() => {
                    courtTouchedRef.current = true;
                    setCourt(suggestion.value);
                  }}
                  className={`rounded-[18px] border p-3 text-left transition ${
                    selected
                      ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-black">
                    {selected && <CheckCircle2 className="size-4" />}
                    {suggestion.title}
                  </span>
                  <span className={`mt-1 block text-xs font-semibold leading-5 ${selected ? "text-white/58" : "text-[var(--lobb-muted)]"}`}>
                    {suggestion.note}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <textarea
          value={court}
          onChange={(e) => {
            courtTouchedRef.current = true;
            setCourt(e.target.value);
          }}
          placeholder={coach?.court_access === "player_arranges" ? "e.g. Lagos Country Club, Lekki Phase 1 courts, Ikoyi Club..." : "Add exact court details if you already know them"}
          rows={3}
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
        />
      </label>

      {/* Note to coach */}
      <label className="mt-5 block">
        <span className="text-sm font-black">
          Note to coach{" "}
          <span className="text-xs font-semibold text-[var(--lobb-muted)]">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I'm a complete beginner / focus on my backhand / bring spare balls"
          rows={3}
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
        />
      </label>

      <BookingButton disabled={court.trim().length === 0} onClick={handleContinue}>
        Continue →
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
