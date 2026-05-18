"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CreditCard, Info, ShieldCheck } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { showLobbToast } from "@/components/lobb-global-state";
import { getBookingDay, getCoach, money } from "@/lib/mock-data";

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function BookingStepThreeContent() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const coach = getCoach(params.coachSlug);
  const day = search.get("day") || "Thu 15";
  const time = search.get("time") || "7:00 AM";
  const bookingDay = getBookingDay(day);
  const court = search.get("court") || "";
  const [seconds, setSeconds] = useState(6 * 60 + 21);
  const warned = useRef(false);
  const fee = coach.rate;
  const lobbFee = Math.round(fee * 0.05);
  const total = fee + lobbFee;

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      router.replace(`/coaches/${coach.slug}?timeout=slot`);
    }
  }, [coach.slug, router, seconds]);

  useEffect(() => {
    if (search.get("payment") === "failed") {
      showLobbToast({ type: "error", message: "Payment failed. Try again." });
    }
  }, [search]);

  useEffect(() => {
    if (seconds <= 120 && !warned.current) {
      warned.current = true;
      showLobbToast({ type: "warning", message: "2 minutes left to complete payment." });
    }
  }, [seconds]);

  return (
    <BookingShell step={3}>
      <p className="mb-5 rounded-full bg-[#fff0e8] px-4 py-2 text-sm font-black text-[var(--lobb-clay)]">{formatCountdown(seconds)} remaining</p>
      <h2 className="font-black">Order Summary</h2>
      <section className="mt-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
        <h3 className="font-black">Coach session with {coach.name}</h3>
        <p className="mt-2 text-sm font-medium text-[var(--lobb-muted)]">{bookingDay.short} · {time}</p>
        <p className="mt-1 text-sm font-medium text-[var(--lobb-muted)]">60 minutes</p>
        <div className="my-4 border-t border-[var(--lobb-border)]" />
        <div className="flex justify-between text-sm font-semibold"><span>Session fee</span><span>{money(fee)}</span></div>
        <div className="mt-3 flex justify-between text-sm font-semibold text-[var(--lobb-muted)]"><span>LOBB fee (5%)</span><span>{money(lobbFee)}</span></div>
        <div className="my-4 border-t border-[var(--lobb-border)]" />
        <div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(total)}</span></div>
      </section>
      <p className="mt-5 flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--lobb-muted)]">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
        <span>Payment is held safely until after your session. Full refund if cancelled 24hrs before.</span>
      </p>
      <BookingButton onClick={() => router.push(`/book/confirm?coach=${coach.slug}&day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}&court=${encodeURIComponent(court)}&total=${total}`)}>
        <span className="inline-flex items-center justify-center gap-2"><CreditCard className="size-4" /> Pay {money(total)} securely</span>
      </BookingButton>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-[var(--lobb-muted)]"><ShieldCheck className="size-3.5" /> Secured by Paystack · Powered by LOBB</p>
    </BookingShell>
  );
}

export default function BookingStepThreePage() {
  return (
    <Suspense fallback={null}>
      <BookingStepThreeContent />
    </Suspense>
  );
}
