"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ClipboardList, CreditCard, MapPin, Phone } from "lucide-react";
import { showLobbToast } from "@/components/lobb-global-state";
import { getBookingDay, getCoach, money } from "@/lib/mock-data";

function BookingConfirmContent() {
  const search = useSearchParams();
  const coach = getCoach(search.get("coach") || "emeka-okonkwo");
  const day = search.get("day") || "Thu 15";
  const time = search.get("time") || "7:00 AM";
  const bookingDay = getBookingDay(day);
  const court = search.get("court") || "";
  const total = Number(search.get("total") || coach.rate * 1.05);

  useEffect(() => {
    showLobbToast({ type: "success", message: "Booking confirmed! Check your SMS." });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--lobb-bg)] p-5 text-[var(--lobb-black)]">
      <section className="w-full max-w-md text-center">
        <CheckCircle className="mx-auto size-20 animate-[successPop_0.35s_ease-out] fill-[#d7f3e4] text-[var(--lobb-success)]" />
        <h1 className="mt-6 text-3xl font-black">You&apos;re booked!</h1>
        <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">Details sent to your phone</p>

        <div className="mt-8 rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 text-left shadow-[0_18px_44px_rgba(58,43,20,0.10)]">
          <p className="font-black">{bookingDay.short} · {time}</p>
          <p className="mt-1 text-sm font-medium text-[var(--lobb-muted)]">60 minutes</p>
          <div className="my-4 border-t border-[var(--lobb-border)]" />
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coach.photo} alt="" className="size-12 rounded-full object-cover" />
            <div>
              <p className="font-black">{coach.name}</p>
              <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.subtitle}</p>
            </div>
          </div>
          <a href="tel:08123456789" className="mt-4 flex items-center gap-2 text-sm font-semibold"><Phone className="size-4 text-[var(--lobb-clay)]" /> 0812 345 6789</a>
          {court && (
            <>
              <div className="my-4 border-t border-[var(--lobb-border)]" />
              <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="size-4 text-[var(--lobb-clay)]" /> {court}</p>
            </>
          )}
          <div className="my-4 border-t border-[var(--lobb-border)]" />
          <p className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-[var(--lobb-clay)]" /> {money(total)} paid</p>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><ClipboardList className="size-4 text-[var(--lobb-clay)]" /> Ref: LOBB-2405-0042</p>
        </div>

        <Link href="/dashboard" className="mt-8 flex h-14 w-full items-center justify-center rounded-full border border-[var(--lobb-black)] text-sm font-black">
          View My Bookings
        </Link>
        <Link href="/" className="mt-4 block text-sm font-bold text-[var(--lobb-muted)]">
          Back to Home
        </Link>
      </section>
    </main>
  );
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={null}>
      <BookingConfirmContent />
    </Suspense>
  );
}
