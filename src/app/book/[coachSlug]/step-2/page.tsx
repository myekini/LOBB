"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, Timer, UserRound } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatSlotDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

function formatSlotTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatSlotEndTime(iso: string) {
  const d = new Date(new Date(iso).getTime() + 60 * 60 * 1000);
  return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
}

function BookingStep2Content() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug   = params.coachSlug;

  const slot      = search.get("slot")    ?? "";
  const lockId    = search.get("lock")    ?? "";
  const expiresAt = search.get("expires") ?? "";

  const [court,    setCourt]   = useState("");
  const [note,     setNote]    = useState("");
  const [seconds,  setSeconds] = useState(() => {
    if (!expiresAt) return 10 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  const warnedRef = useRef(false);

  // Redirect on missing params
  useEffect(() => {
    if (!slot || !lockId || !expiresAt) {
      router.replace(`/coaches/${slug}`);
    }
  }, [slot, lockId, expiresAt, router, slug]);

  // Countdown
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

  // Warn at 2 minutes
  useEffect(() => {
    if (seconds <= 120 && seconds > 0 && !warnedRef.current) {
      warnedRef.current = true;
      // Would use showLobbToast here but we don't import it to keep the file clean
    }
  }, [seconds]);

  const canContinue = court.trim().length > 0;

  const handleContinue = () => {
    router.push(
      `/book/${slug}/step-3?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}&location=${encodeURIComponent(court.trim())}&note=${encodeURIComponent(note.trim())}`
    );
  };

  return (
    <BookingShell step={2} backHref={`/book/${slug}/step-1`}>
      {/* Slot summary */}
      <section className="space-y-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold text-[var(--lobb-muted)] shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
        {slot && (
          <>
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
              {formatSlotDate(slot)}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 className="size-4 text-[var(--lobb-clay)]" />
              {formatSlotTime(slot)} – {formatSlotEndTime(slot)}
            </p>
          </>
        )}
        <p className="flex items-center gap-2">
          <UserRound className="size-4 text-[var(--lobb-clay)]" />
          {slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ")}
        </p>
        <p className="flex items-center gap-2">
          <Timer className="size-4 text-[var(--lobb-clay)]" />
          60 minutes
        </p>
      </section>

      {/* Countdown */}
      <p className="mt-4 rounded-full bg-[#fff0e8] px-4 py-2 text-center text-sm font-black text-[var(--lobb-clay)]">
        {formatCountdown(seconds)} remaining to complete
      </p>

      {/* Court arrangement */}
      <label className="mt-6 block">
        <span className="text-sm font-black">
          Court arrangement <span className="text-[#ba1a1a]">*</span>
        </span>
        <textarea
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          placeholder="Where will you play? (e.g. Lagos Country Club, Lekki Phase 1 courts)"
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
          placeholder="e.g. I'm a complete beginner / Focus on my backhand today"
          rows={3}
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
        />
      </label>

      <BookingButton disabled={!canContinue} onClick={handleContinue}>
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
