"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CalendarDays, Clock3, Timer, UserRound } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { getBookingDay, getCoach, getSessionEndTime } from "@/lib/mock-data";

function formatCountdown(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function BookingStepTwoContent() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const coach = getCoach(params.coachSlug);
  const day = search.get("day") || "Thu 15";
  const time = search.get("time") || "7:00 AM";
  const bookingDay = getBookingDay(day);
  const endTime = getSessionEndTime(time);
  const [seconds, setSeconds] = useState(8 * 60 + 43);
  const [court, setCourt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      router.replace(`/coaches/${coach.slug}?timeout=slot`);
    }
  }, [coach.slug, router, seconds]);

  return (
    <BookingShell step={2}>
      <section className="space-y-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold text-[var(--lobb-muted)] shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
        <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[var(--lobb-clay)]" /><span>{bookingDay.full}</span></p>
        <p className="flex items-center gap-2"><Clock3 className="size-4 text-[var(--lobb-clay)]" /><span>{time} - {endTime}</span></p>
        <p className="flex items-center gap-2"><UserRound className="size-4 text-[var(--lobb-clay)]" /><span>{coach.name}</span></p>
        <p className="flex items-center gap-2"><Timer className="size-4 text-[var(--lobb-clay)]" /><span>60 minutes</span></p>
      </section>
      <p className="mt-4 rounded-full bg-[#fff0e8] px-4 py-2 text-sm font-black text-[var(--lobb-clay)]">{formatCountdown(seconds)} remaining to complete</p>

      <label className="mt-6 block">
        <span className="text-sm font-black">Court arrangement</span>
        <textarea
          value={court}
          onChange={(event) => setCourt(event.target.value)}
          placeholder="Where will you play? (e.g. Lagos Country Club, Lekki Phase 1 courts)"
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
        />
      </label>
      <label className="mt-5 block">
        <span className="text-sm font-black">Note to coach (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. I'm a complete beginner / Focus on my backhand today"
          className="mt-2 h-28 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
        />
      </label>
      <BookingButton
        onClick={() =>
          router.push(
            `/book/${coach.slug}/step-3?day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}&court=${encodeURIComponent(court)}&note=${encodeURIComponent(note)}`
          )
        }
      >
        Continue →
      </BookingButton>
    </BookingShell>
  );
}

export default function BookingStepTwoPage() {
  return (
    <Suspense fallback={null}>
      <BookingStepTwoContent />
    </Suspense>
  );
}
