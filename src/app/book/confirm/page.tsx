"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import {
  CalendarDays,
  CheckCircle,
  ClipboardList,
  CreditCard,
  ReceiptText,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { showLobbToast } from "@/providers/lobb-global-state";
import { LobbBrandLoader } from "@/components/common/lobb-skeleton";
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
  const reference = search.get("reference") ?? search.get("trxref");

  const [booking,       setBooking]       = useState<BookingWithDetails | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [failed,        setFailed]        = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

  useEffect(() => {
    if (!reference) { setFailed(true); setLoading(false); return; }

    let cancelled = false;
    let attempts  = 0;

    const verify = () => {
      attempts += 1;
      fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
        .then(async (res) => {
          const json = (await res.json()) as { booking?: BookingWithDetails; error?: string };
          // 402 = Paystack confirmed the payment failed (abandoned/failed status)
          if (res.status === 402) {
            if (!cancelled) { setPaymentFailed(true); setLoading(false); }
            return;
          }
          if (!res.ok || !json.booking) throw new Error(json.error ?? "Not found");
          // Booking exists but confirmation webhook hasn't arrived yet — keep retrying
          if (json.booking.status !== "confirmed" && json.booking.payment_status !== "paid") {
            throw new Error("Payment still processing");
          }
          if (cancelled) return;
          setBooking(json.booking);
          track("Booking Confirmed", {
            booking_id: json.booking.id,
            coach_slug: json.booking.coach_slug,
            coach_name: json.booking.coach_full_name,
            total_paid: json.booking.total_amount_ngn,
            reference:  json.booking.paystack_reference,
          });
          showLobbToast({ type: "success", message: "Booking confirmed! Check your WhatsApp." });
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempts < 12) {
            // Progressive backoff: ~1.5s, 3s, then capped at 7s per attempt (~60s total window)
            const delay = attempts <= 3 ? attempts * 1500 : Math.min(attempts * 2000, 7000);
            window.setTimeout(verify, delay);
            return;
          }
          setFailed(true);
          setLoading(false);
        });
    };

    verify();

    return () => { cancelled = true; };
  }, [reference]);

  if (loading) {
    return <LobbBrandLoader message="Verifying your payment and securing your booking." />;
  }

  if (paymentFailed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--lobb-bg)] p-5">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <CreditCard className="size-8 text-red-500" />
          </div>
          <p className="mt-5 text-lg font-black text-[var(--lobb-black)]">Payment not completed</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">
            Your payment did not go through. No charge was made. Please try booking again.
          </p>
          <Link
            href="/"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]"
          >
            Browse Coaches
          </Link>
          <Link href="/dashboard" className="mt-4 block text-sm font-bold text-[var(--lobb-muted)]">
            My Bookings
          </Link>
        </div>
      </main>
    );
  }

  if (failed || !booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--lobb-bg)] p-5">
        <div className="w-full max-w-md text-center">
          <p className="text-lg font-black text-[var(--lobb-black)]">Payment is still being confirmed</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">
            This can take a minute. Check My Bookings — it will appear there once confirmed.
            If you were charged, save this reference:
          </p>
          {reference && (
            <p className="mt-3 rounded-lg bg-[var(--lobb-surface)] px-4 py-2 font-mono text-sm font-bold select-all">
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
          <div className="inline-flex size-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_12px_24px_rgba(16,185,129,0.15)] animate-[successPop_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]">
            <CheckCircle className="size-10 text-[var(--lobb-success)]" />
          </div>
          <h1 className="mt-6 text-2.5xl font-black tracking-tight text-[var(--lobb-black)]">Booking Confirmed!</h1>
          <p className="mt-1.5 text-xs font-semibold text-[var(--lobb-muted)] uppercase tracking-wider">Details sent to your phone</p>
        </div>

        {/* Booking receipt */}
        <div className="mt-7 rounded-[32px] border border-[var(--lobb-border)] bg-gradient-to-b from-white to-[var(--lobb-surface)] p-6 shadow-[0_24px_50px_rgba(58,43,20,0.04)]">
          {/* Session time */}
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-[var(--lobb-black)]">
              <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
              {formatDateTime(booking.starts_at)}
            </p>
            <p className="ml-6 mt-1 text-xs font-bold text-[var(--lobb-muted)] uppercase tracking-wider">
              {formatEndTime(booking.starts_at)} · 60 minutes session
            </p>
          </div>

          <div className="my-5 border-t border-dashed border-[var(--lobb-border)]" />

          {/* Coach */}
          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] shadow-sm">
              {booking.coach_profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={booking.coach_profile_photo_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center font-bold text-[var(--lobb-muted)] bg-[var(--lobb-surface-2)]">
                  {booking.coach_full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-clay)]">Your Coach</p>
              <p className="font-black text-base text-[var(--lobb-black)] tracking-tight">{booking.coach_full_name}</p>
              {booking.coach_slug && (
                <Link href={`/coaches/${booking.coach_slug}`} className="text-xs font-semibold text-[var(--lobb-clay)] hover:underline">
                  View profile →
                </Link>
              )}
            </div>
          </div>

          {/* Coach contact */}
          {booking.coach_phone && (
            <div className="mt-4 flex gap-2.5">
              <a
                href={`tel:${booking.coach_phone.replace(/\s/g, "")}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-white py-2.5 text-xs font-black shadow-sm transition-all hover:bg-[var(--lobb-surface)] active:scale-95 text-[var(--lobb-black)]"
              >
                <Phone className="size-3.5 text-[var(--lobb-clay)]" /> Call Coach
              </a>
              <a
                href={`https://wa.me/${toWhatsAppNumber(booking.coach_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-white py-2.5 text-xs font-black shadow-sm transition-all hover:bg-[var(--lobb-surface)] active:scale-95 text-[var(--lobb-black)]"
              >
                <MessageCircle className="size-3.5 text-[var(--lobb-clay)]" /> WhatsApp
              </a>
            </div>
          )}

          {/* Location */}
          {booking.location && (
            <>
              <div className="my-5 border-t border-dashed border-[var(--lobb-border)]" />
              <p className="flex items-start gap-2.5 text-xs font-semibold text-[var(--lobb-muted)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
                <span className="text-[var(--lobb-black)] leading-relaxed">{booking.location}</span>
              </p>
            </>
          )}

          <div className="my-5 border-t border-dashed border-[var(--lobb-border)]" />

          {/* Payment */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--lobb-muted)]">
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-[var(--lobb-clay)]" /> Total Paid
              </span>
              <span className="font-black text-[var(--lobb-black)] text-base">{money(booking.total_amount_ngn)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[var(--lobb-surface-2)]/60 px-3.5 py-2.5 text-xs border border-[var(--lobb-border)]/50">
              <span className="flex items-center gap-1.5 font-bold text-[var(--lobb-muted)]">
                <ClipboardList className="size-3.5 text-[var(--lobb-clay)]" /> Reference
              </span>
              <span className="font-mono text-[var(--lobb-black)] font-black text-[11px] select-all">
                {booking.paystack_reference ?? reference}
              </span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <Link
          href="/dashboard"
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.18)] transition-all hover:opacity-90 active:scale-98"
        >
          View My Bookings
        </Link>
        <Link
          href={`/dashboard/bookings/${booking.id}/receipt${booking.paystack_reference ?? reference ? `?reference=${encodeURIComponent(booking.paystack_reference ?? reference ?? "")}` : ""}`}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black text-[var(--lobb-black)]"
        >
          <ReceiptText className="size-4 text-[var(--lobb-clay)]" />
          View Receipt
        </Link>
        <Link href="/" className="mt-4 block text-center text-xs font-black uppercase tracking-wider text-[var(--lobb-muted)] hover:text-[var(--lobb-clay)] transition-all">
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
