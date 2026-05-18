"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, Clock3, X } from "lucide-react";

const initialDays = [
  { day: "Monday", enabled: false, start: "06:00", end: "09:00" },
  { day: "Tuesday", enabled: true, start: "06:00", end: "09:00" },
  { day: "Wednesday", enabled: true, start: "09:00", end: "17:00" },
  { day: "Thursday", enabled: false, start: "07:00", end: "10:00" },
  { day: "Friday", enabled: false, start: "07:00", end: "10:00" },
  { day: "Saturday", enabled: true, start: "09:00", end: "12:00" },
  { day: "Sunday", enabled: false, start: "08:00", end: "11:00" },
];

export default function CoachAvailabilityPage() {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [saved, setSaved] = useState(false);

  const updateDay = (index: number, updates: Partial<(typeof initialDays)[number]>) => {
    setDays((current) => current.map((day, dayIndex) => (dayIndex === index ? { ...day, ...updates } : day)));
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-32 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black">My Availability</h1>
        </header>

        {saved && <p className="mb-5 rounded-[18px] bg-[#e8f4ed] px-4 py-3 text-sm font-black text-[var(--lobb-success)]">Availability saved.</p>}

        <section>
          <h2 className="font-black">Weekly Schedule</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">Set when you&apos;re available each week.</p>
          <div className="mt-4 space-y-3">
            {days.map((item, index) => (
              <article key={item.day} className={`rounded-[20px] border bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)] ${item.enabled ? "border-[var(--lobb-clay)]" : "border-[var(--lobb-border)]"}`}>
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black">{item.day}</p>
                  <button
                    onClick={() => updateDay(index, { enabled: !item.enabled })}
                    className={`relative h-7 w-12 rounded-full transition ${item.enabled ? "bg-[var(--lobb-black)]" : "bg-[var(--lobb-surface-2)]"}`}
                    aria-label={`Toggle ${item.day}`}
                  >
                    <span className={`absolute top-1 size-5 rounded-full bg-white transition ${item.enabled ? "left-6" : "left-1"}`} />
                  </button>
                </div>

                {item.enabled ? (
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TimeInput value={item.start} onChange={(value) => updateDay(index, { start: value })} />
                    <span className="text-xs font-black text-[var(--lobb-muted)]">to</span>
                    <TimeInput value={item.end} onChange={(value) => updateDay(index, { end: value })} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-semibold italic text-[var(--lobb-muted)]">Closed</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="font-black">Block Specific Dates</h2>
          <button className="mt-4 flex w-full items-center gap-3 rounded-[20px] border border-dashed border-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4 text-left text-sm font-black text-[var(--lobb-clay)]">
            <CalendarPlus className="size-5" />
            Add a date to block
          </button>

          <h3 className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Blocked dates</h3>
          <div className="mt-3 space-y-3">
            <BlockedDate month="May" day="24" title="Sat 24 May" note="Holiday" />
            <BlockedDate month="Jun" day="02" title="Mon 02 June" note="9:00 AM - 12:00 PM · Dentist" />
          </div>
        </section>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
        <div className="mx-auto max-w-md">
          <button onClick={() => setSaved(true)} className="h-14 w-full rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]">
            Save Availability
          </button>
        </div>
      </footer>
    </main>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-12 items-center gap-2 rounded-[14px] border border-[var(--lobb-border)] bg-white px-3">
      <Clock3 className="size-4 text-[var(--lobb-clay)]" />
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-black outline-none" />
    </label>
  );
}

function BlockedDate({ month, day, title, note }: { month: string; day: string; title: string; note: string }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--lobb-border)] border-l-4 border-l-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-[12px] bg-white px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase text-[var(--lobb-clay)]">{month}</p>
          <p className="text-lg font-black">{day}</p>
        </div>
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">{note}</p>
        </div>
      </div>
      <button className="flex size-9 items-center justify-center rounded-full text-[var(--lobb-muted)]" aria-label="Remove blocked date">
        <X className="size-4" />
      </button>
    </article>
  );
}
