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
import { LobbErrorBanner } from "@/components/common/lobb-error";
import { appError, type AppErrorPayload } from "@/lib/app-errors";
import { readApiError, toastAppError } from "@/lib/client-errors";

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
  const [confirmError,  setConfirmError]  = useState<AppErrorPayload | null>(null);

  useEffect(() => {
    if (!reference) {
      setConfirmError(appError("PAYMENT_NOT_FOUND"));
      setFailed(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts  = 0;

    const verify = () => {
      attempts += 1;
      fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
        .then(async (res) => {
          // 402 = Paystack confirmed the payment failed (abandoned/failed status)
          if (res.status === 402) {
            const paymentError = await readApiError(res, "PAYMENT_FAILED");
            if (!cancelled) {
              setConfirmError(paymentError);
              toastAppError(paymentError, "PAYMENT_FAILED");
              setPaymentFailed(true);
              setLoading(false);
            }
            return;
          }
          if (!res.ok) throw await readApiError(res, "PAYMENT_VERIFY_FAILED");
          const json = (await res.json()) as { booking?: BookingWithDetails };
          if (!json.booking) throw appError("PAYMENT_VERIFY_FAILED");
          // Booking exists but confirmation webhook has not arrived yet, so keep retrying.
          if (json.booking.status !== "confirmed" && json.booking.payment_status !== "paid") {
            throw appError("PAYMENT_PENDING");
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
        .catch((err) => {
          if (cancelled) return;
          if (attempts < 12) {
            // Progressive backoff: ~1.5s, 3s, then capped at 7s per attempt (~60s total window)
            const delay = attempts <= 3 ? attempts * 1500 : Math.min(attempts * 2000, 7000);
            window.setTimeout(verify, delay);
            return;
          }
          setConfirmError(toastAppError(err, "PAYMENT_VERIFY_FAILED"));
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
      <main className="lobb-app-page flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--lobb-error)]/10 border border-[var(--lobb-error)]/20">
            <CreditCard className="size-8 text-[var(--lobb-error)]" />
          </div>
          <p className="mt-5 text-lg font-black text-[var(--lobb-black)]">Payment not completed</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">
            Your payment did not go through. No charge was made. Please try booking again.
          </p>
          <LobbErrorBanner error={confirmError} fallbackCode="PAYMENT_FAILED" className="mt-5 text-left" />
          <Link
            href="/"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]"
          >
            Browse coaches
          </Link>
          <Link href="/dashboard" className="mt-4 block text-sm font-bold text-[var(--lobb-muted)]">
            My bookings
          </Link>
        </div>
      </main>
    );
  }

  if (failed || !booking) {
    return (
      <main className="lobb-app-page flex min-h-screen items-center justify-center p-5">
        <div className="w-full max-w-md text-center">
          <p className="text-lg font-black text-[var(--lobb-black)]">Payment is still being confirmed</p>
          <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">
            This can take a minute. Check your bookings, it will appear there once confirmed.
            If you were charged, save this reference:
          </p>
          <LobbErrorBanner error={confirmError} fallbackCode="PAYMENT_PENDING" className="mt-5 text-left" />
          {reference && (
            <p className="mt-3 rounded-lg bg-[var(--lobb-surface)] px-4 py-2 font-mono text-sm font-bold select-all">
              {reference}
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-8 flex h-14 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]"
          >
            Go to my bookings
          </Link>
          <Link href="/" className="mt-4 block text-sm font-bold text-[var(--lobb-muted)]">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="lobb-app-page flex min-h-screen flex-col items-center justify-center p-5 text-[var(--lobb-text-primary)]">
      <section className="w-full max-w-md">
        {/* Success header */}
        <div className="text-center">
          <div className="inline-flex size-20 items-center justify-center rounded-[16px] border border-[var(--lobb-success)]/20 bg-[var(--lobb-success)]/10">
            <CheckCircle className="size-10 text-[var(--lobb-success)]" />
          </div>
          <h1 className="mt-6 text-2.5xl font-black tracking-tight text-[var(--lobb-text-primary)]">Booking confirmed</h1>
          <p className="mt-1.5 text-xs font-semibold text-[var(--lobb-text-secondary)]">Details sent to your phone</p>
        </div>

        {/* Booking receipt */}
        <div className="lobb-app-card mt-7 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6">
          {/* Session time */}
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-[var(--lobb-black)]">
              <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
              {formatDateTime(booking.starts_at)}
            </p>
            <p className="ml-6 mt-1 text-xs font-bold text-[var(--lobb-muted)] uppercase tracking-wider">
              {formatEndTime(booking.starts_at)}, 60 minute session
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
                  View profile
                </Link>
              )}
            </div>
          </div>

          {/* Coach contact */}
          {booking.coach_phone && (
            <div className="mt-4 flex gap-2.5">
              <a
                href={`tel:${booking.coach_phone.replace(/\s/g, "")}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] py-2.5 text-xs font-black text-[var(--lobb-text-primary)] transition-all hover:bg-[var(--lobb-bg-secondary)] active:scale-95"
              >
                <Phone className="size-3.5 text-[var(--lobb-clay)]" /> Call Coach
              </a>
              <a
                href={`https://wa.me/${toWhatsAppNumber(booking.coach_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] py-2.5 text-xs font-black text-[var(--lobb-text-primary)] transition-all hover:bg-[var(--lobb-bg-secondary)] active:scale-95"
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
          className="mt-7 flex h-14 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] transition-all active:scale-98"
        >
          View my bookings
        </Link>
        <Link
          href={`/dashboard/bookings/${booking.id}/receipt${booking.paystack_reference ?? reference ? `?reference=${encodeURIComponent(booking.paystack_reference ?? reference ?? "")}` : ""}`}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black text-[var(--lobb-black)]"
        >
          <ReceiptText className="size-4 text-[var(--lobb-clay)]" />
          View receipt
        </Link>
        <Link href="/" className="mt-4 block text-center text-xs font-black text-[var(--lobb-muted)] transition-all hover:text-[var(--lobb-clay)]">
          Back to home
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
