"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle,
  ClipboardList,
  CreditCard,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { showLobbToast } from "@/components/lobb-global-state";
import { BookingCardSkeleton, SkeletonBlock } from "@/components/lobb-skeleton";
import type { BookingWithDetails } from "@/lib/types";

function money(v: number) { return `₦${v.toLocaleString()}`; }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "long", day: "numeric", month: "long",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Africa/Lagos",
  });
}

function formatEndTime(iso: string) {
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toLocaleTimeString("en-NG", {
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Africa/Lagos",
  });
}

function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function BookingConfirmContent() {
  const search    = useSearchParams();
  const reference = search.get("reference");

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    if (!reference) { setFailed(true); setLoading(false); return; }

    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const json = (await res.json()) as { booking?: BookingWithDetails; error?: string };
        if (!res.ok || !json.booking) throw new Error(json.error ?? "Not found");
        setBooking(json.booking);
        showLobbToast({ type: "success", message: "Booking confirmed! Check your WhatsApp." });
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [reference]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] p-5">
        <section className="mx-auto max-w-md pt-16">
          <SkeletonBlock className="mx-auto size-20 rounded-full" />
          <SkeletonBlock className="mx-auto mt-6 h-9 w-48" />
          <SkeletonBlock className="mx-auto mt-3 h-4 w-40" />
          <div className="mt-8"><BookingCardSkeleton /></div>
        </section>
      </main>
    );
  }

  if (failed || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--lobb-bg)] p-5">
        <div className="w-full max-w-md text-center">
          <p className="text-lg font-black text-[var(--lobb-black)]">Payment could not be confirmed</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">
            If you were charged, contact us with reference:
          </p>
          {reference && (
            <p className="mt-1 rounded-lg bg-[var(--lobb-surface)] px-4 py-2 font-mono text-sm font-bold">
              {reference}
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]"
          >
            Go to My Bookings
          </Link>
          <Link href="/" className="mt-4 block text-sm font-bold text-[var(--lobb-muted)]">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--lobb-bg)] p-5 text-[var(--lobb-black)]">
      <section className="w-full max-w-md">
        {/* Success header */}
        <div className="text-center">
          <CheckCircle className="mx-auto size-20 animate-[successPop_0.35s_ease-out] fill-[#d7f3e4] text-[var(--lobb-success)]" />
          <h1 className="mt-5 text-3xl font-black">You&apos;re booked!</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">Details sent to your phone</p>
        </div>

        {/* Booking receipt */}
        <div className="mt-7 rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 shadow-[0_18px_44px_rgba(58,43,20,0.10)]">
          {/* Session time */}
          <p className="flex items-start gap-2 font-black">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
            {formatDateTime(booking.starts_at)}
          </p>
          <p className="ml-6 mt-1 text-sm font-medium text-[var(--lobb-muted)]">
            – {formatEndTime(booking.starts_at)} · 60 minutes
          </p>

          <div className="my-4 border-t border-[var(--lobb-border)]" />

          {/* Coach */}
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
              {booking.coach_profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={booking.coach_profile_photo_url} alt="" className="size-full object-cover" />
              )}
            </div>
            <div>
              <p className="font-black">{booking.coach_full_name}</p>
              {booking.coach_slug && (
                <Link href={`/coaches/${booking.coach_slug}`} className="text-sm font-semibold text-[var(--lobb-clay)]">
                  View profile →
                </Link>
              )}
            </div>
          </div>

          {/* Coach contact */}
          {booking.coach_phone && (
            <div className="mt-4 flex gap-2">
              <a
                href={`tel:${booking.coach_phone.replace(/\s/g, "")}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-bg)] py-2 text-xs font-bold"
              >
                <Phone className="size-3.5 text-[var(--lobb-clay)]" /> Call
              </a>
              <a
                href={`https://wa.me/${toWhatsAppNumber(booking.coach_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-bg)] py-2 text-xs font-bold"
              >
                <MessageCircle className="size-3.5 text-[var(--lobb-clay)]" /> WhatsApp
              </a>
            </div>
          )}

          {/* Location */}
          {booking.location && (
            <>
              <div className="my-4 border-t border-[var(--lobb-border)]" />
              <p className="flex items-start gap-2 text-sm font-semibold">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                {booking.location}
              </p>
            </>
          )}

          <div className="my-4 border-t border-[var(--lobb-border)]" />

          {/* Payment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-[var(--lobb-clay)]" /> Total paid
              </span>
              <span className="font-black">{money(booking.total_amount_ngn)}</span>
            </div>
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--lobb-muted)]">
              <ClipboardList className="size-4 text-[var(--lobb-clay)]" />
              Ref: {booking.paystack_reference ?? reference}
            </p>
          </div>
        </div>

        {/* CTAs */}
        <Link
          href="/dashboard"
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]"
        >
          View My Bookings
        </Link>
        <Link href="/" className="mt-4 block text-center text-sm font-bold text-[var(--lobb-muted)]">
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
