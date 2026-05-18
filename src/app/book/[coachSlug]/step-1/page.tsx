"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3, LockKeyhole, Star } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { bookingDays, getBookingDay, getCoach } from "@/lib/mock-data";

function BookingStepOneContent() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const coach = getCoach(params.coachSlug);
  const [day, setDay] = useState(search.get("day") || Object.keys(coach.slots)[0] || "Thu 15");
  const [time, setTime] = useState(search.get("time") || "");
  const slots = useMemo(() => coach.slots[day] || [], [coach.slots, day]);
  const selectedDay = getBookingDay(day);

  return (
    <BookingShell step={1}>
      <section className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coach.photo} alt="" className="size-12 rounded-full object-cover" />
          <div>
            <h2 className="font-black">{coach.name}</h2>
            <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.subtitle}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-black"><Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" /> {coach.rating}</p>
          </div>
        </div>
      </section>

      <h2 className="mt-6 font-black">Select your date</h2>
      <div className="mt-3 flex items-center justify-between text-sm font-bold text-[var(--lobb-muted)]">
        <button className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Previous week">
          <ChevronLeft className="size-4" />
        </button>
        <p>Mon 12 — Sun 18 May</p>
        <button className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Next week">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-6 gap-1">
        {bookingDays.slice(0, 6).map((item) => {
          const available = Boolean(coach.slots[item.key]);
          return (
            <button
              key={item.key}
              disabled={!available}
              onClick={() => {
                setDay(item.key);
                setTime("");
              }}
              className={`rounded-2xl border py-2 text-xs font-semibold ${day === item.key ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white" : available ? "border-[var(--lobb-border)] bg-[var(--lobb-surface)]" : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[#9b958a]"}`}
            >
              <span className="block font-bold">{item.weekday}</span>
              {item.day}
            </button>
          );
        })}
      </div>

      <h3 className="mt-6 font-black">Available times — {selectedDay.short}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {slots.map((slot) => (
          <button
            key={slot}
            onClick={() => setTime(slot)}
            className={`h-12 rounded-full border text-sm font-black ${time === slot ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white" : "border-[var(--lobb-border)] bg-[var(--lobb-surface)]"}`}
          >
            {slot}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2 text-sm font-semibold text-[var(--lobb-muted)]">
        <p className="flex items-center gap-2"><Clock3 className="size-4" /> Duration: 60 minutes</p>
        {time && <p className="flex items-start gap-2 text-[var(--lobb-green)]"><LockKeyhole className="mt-0.5 size-4 shrink-0" /> Slot held for 10 minutes after you proceed.</p>}
      </div>
      <BookingButton
        disabled={!day || !time}
        onClick={() => router.push(`/book/${coach.slug}/step-2?day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}`)}
      >
        Continue →
      </BookingButton>
    </BookingShell>
  );
}

export default function BookingStepOnePage() {
  return (
    <Suspense fallback={null}>
      <BookingStepOneContent />
    </Suspense>
  );
}
