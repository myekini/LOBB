"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { ConsentCheckbox, ConsentLink } from "@/components/ui/consent-checkbox";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import type { CoachPublicProfile } from "@/lib/types";
import { track } from "@/lib/analytics";
import { readApiError, toastAppError } from "@/lib/client-errors";

const LOBB_FEE_RATE = 0.05;

type PaystackPopup = {
  resumeTransaction: (accessCode: string, callbacks: {
    onSuccess: (transaction: { reference: string }) => void;
    onCancel: () => void;
    onError: (error: { message?: string }) => void;
  }) => void;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

function formatCountdown(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatSlotShort(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatSlotEnd(iso: string) {
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toLocaleTimeString("en-NG", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function countdownStyle(seconds: number) {
  if (seconds <= 120) return "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]";
  if (seconds <= 240) return "bg-[var(--lobb-warning)]/10 text-[var(--lobb-warning)]";
  return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]";
}

function money(v: number) { return `₦${v.toLocaleString()}`; }

function BookingStep3Content() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug   = params.coachSlug;

  const slot      = search.get("slot")      ?? "";
  const lockId    = search.get("lock")      ?? "";
  const expiresAt = search.get("expires")   ?? "";
  const location  = search.get("location")  ?? "";
  const note      = search.get("note")      ?? "";
  const courtId   = search.get("court_id")  ?? "";
  const subCourt  = search.get("sub_court") ?? "";
  const [coach,   setCoach]   = useState<CoachPublicProfile | null>(null);
  const [paying,  setPaying]  = useState(false);
  const [paymentStage, setPaymentStage] = useState<"idle" | "opening" | "confirming">("idle");
  const [paystackReady, setPaystackReady] = useState(false);
  const [paymentSession, setPaymentSession] = useState<{ reference: string; accessCode: string } | null>(null);
  const [acceptedCancellationPolicy, setAcceptedCancellationPolicy] = useState(false);
  const [seconds, setSeconds] = useState(() => {
    if (!expiresAt) return 10 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!slot || !lockId || !expiresAt) router.replace(`/coaches/${slug}`);
  }, [slot, lockId, expiresAt, router, slug]);

  useEffect(() => {
    fetch(`/api/coaches/${slug}`)
      .then((r) => r.json())
      .then(({ coach: c }: { coach: CoachPublicProfile }) => setCoach(c))
      .catch(() => null);
  }, [slug]);

  useEffect(() => {
    if (search.get("payment") === "failed") {
      showLobbToast({ type: "error", message: "Payment failed. Please try again." });
    }
  }, [search]);

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
      showLobbToast({ type: "warning", message: "2 minutes left to complete payment." });
    }
  }, [seconds]);

  const sessionFee = coach?.hourly_rate_ngn ?? 0;
  const lobbFee    = Math.round(sessionFee * LOBB_FEE_RATE);
  const total      = sessionFee + lobbFee;
  const canPay = Boolean(coach) && acceptedCancellationPolicy;

  const verifyAndOpenBooking = async (reference: string) => {
    setPaymentStage("confirming");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
      if (response.ok) {
        const payload = (await response.json()) as { booking?: { id: string; status?: string; payment_status?: string } };
        if (payload.booking && (payload.booking.status === "confirmed" || payload.booking.payment_status === "paid")) {
          track("Booking Confirmed", { booking_id: payload.booking.id, coach_slug: slug, total_paid: total, reference });
          router.replace(`/dashboard/bookings/${payload.booking.id}?confirmed=1`);
          return;
        }
      } else if (response.status === 402) {
        throw new Error("Payment was not completed. You can try again.");
      }
      await new Promise((resolve) => window.setTimeout(resolve, attempt < 3 ? 1200 : 2500));
    }
    router.replace(`/book/confirm?reference=${encodeURIComponent(reference)}`);
  };

  const openPaystack = (session: { reference: string; accessCode: string }) => {
    if (!window.PaystackPop) {
      window.location.href = `/book/confirm?reference=${encodeURIComponent(session.reference)}`;
      return;
    }
    setPaymentStage("opening");
    const popup = new window.PaystackPop();
    popup.resumeTransaction(session.accessCode, {
      onSuccess: (transaction) => {
        void verifyAndOpenBooking(transaction.reference || session.reference).catch((error) => {
          toastAppError(error, "PAYMENT_VERIFY_FAILED");
          setPaymentStage("idle");
          setPaying(false);
        });
      },
      onCancel: () => {
        setPaymentStage("idle");
        setPaying(false);
        showLobbToast({ type: "info", message: "Payment paused. Your booking details are still here." });
      },
      onError: (error) => {
        toastAppError(new Error(error.message || "Paystack could not open."), "PAYMENT_INIT_FAILED");
        setPaymentStage("idle");
        setPaying(false);
      },
    });
  };

  const handlePay = async () => {
    if (paying || !canPay) return;
    setPaying(true);
    if (paymentSession) {
      openPaystack(paymentSession);
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          coach_slug:         slug,
          slot_starts_at:     slot,
          lock_id:            lockId,
          location,
          player_notes:       note || undefined,
          location_venue_id:  courtId  || undefined,
          location_court_id:  subCourt || undefined,
          cancellation_policy_accepted: acceptedCancellationPolicy,
        }),
      });
      if (!res.ok) {
        toastAppError(await readApiError(res, "PAYMENT_INIT_FAILED"), "PAYMENT_INIT_FAILED");
        setPaying(false);
        return;
      }
      const json = (await res.json()) as {
        booking_id?: string; reference?: string; access_code?: string;
      };
      if (!json.booking_id || !json.reference || !json.access_code) {
        toastAppError(new Error("Could not initiate payment. Try again."), "PAYMENT_INIT_FAILED");
        setPaying(false);
        return;
      }
      track("Payment Initiated", {
        coach_slug: slug,
        session_fee: sessionFee,
        lobb_fee: lobbFee,
        total: total,
        booking_id: json.booking_id,
        reference: json.reference,
      });
      const session = { reference: json.reference, accessCode: json.access_code };
      setPaymentSession(session);
      openPaystack(session);
    } catch {
      toastAppError(null, "NETWORK_ERROR");
      setPaying(false);
    }
  };

  return (
    <>
    <Script
      src="https://js.paystack.co/v2/inline.js"
      strategy="afterInteractive"
      onLoad={() => setPaystackReady(true)}
    />
    <BookingShell
      step={3}
      backHref={`/book/${slug}/step-2?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}`}
    >
      {/* Countdown */}
      <div className="lobb-surface-outlined mb-4 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--lobb-text-secondary)]">Final step</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--lobb-text-primary)]">Review your booking</h2>
          </div>
          <span className={`shrink-0 rounded-[var(--lobb-radius-md)] px-3 py-2 text-xs font-medium tabular-nums transition-colors duration-500 ${countdownStyle(seconds)}`}>
            Held {formatCountdown(seconds)}
          </span>
        </div>
        </div>
      </div>

      <section className="lobb-surface-outlined overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        <div className="p-4 sm:p-5">
        {/* Coach identity */}
        {coach && (
          <div className="mb-4 flex items-center gap-3.5 border-b border-[var(--lobb-border-subtle)] pb-4">
            <div className="size-14 shrink-0 overflow-hidden rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)]">
              {coach.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center bg-[var(--lobb-bg-secondary)] font-bold text-[var(--lobb-text-secondary)]">
                  {coach.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--lobb-text-secondary)]">Coach</p>
              <p className="text-base font-medium tracking-tight text-[var(--lobb-text-primary)]">{coach.full_name}</p>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="grid gap-2 text-sm font-medium text-[var(--lobb-text-secondary)]">
          {slot && (
            <div className="flex items-center gap-3 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
              <CalendarDays className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="text-[var(--lobb-text-primary)]">{formatSlotShort(slot)} - {formatSlotEnd(slot)}</span>
            </div>
          )}
          {location && (
            <div className="flex items-start gap-3 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="leading-relaxed text-[var(--lobb-text-primary)]">{location}</span>
            </div>
          )}
        </div>

        <div className="my-5 border-t border-dashed border-[var(--lobb-border-subtle)]" />

        {/* Fee breakdown */}
        {coach ? (
          <div className="space-y-3.5">
            <div className="flex justify-between text-sm font-medium text-[var(--lobb-text-secondary)]">
              <span>Session fee</span>
              <span className="font-medium text-[var(--lobb-text-primary)]">{money(sessionFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-[var(--lobb-text-secondary)]">
              <span>LOBB service fee (5%)</span>
              <span className="font-medium text-[var(--lobb-text-primary)]">{money(lobbFee)}</span>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)]/20 bg-[var(--lobb-clay-light)] px-4 py-4">
                <span className="text-sm font-semibold text-[var(--lobb-text-primary)]">Total</span>
                <span className="text-xl font-semibold text-[var(--lobb-clay)]">{money(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-12 w-full rounded-[var(--lobb-radius-lg)]" />
          </div>
        )}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs leading-5 text-[var(--lobb-text-secondary)]">
        <ShieldCheck className="size-4 shrink-0 text-[var(--lobb-success)]" />
        Payment is released to the coach after the session.
      </div>

      <ConsentCheckbox
        className="mt-4"
        checked={acceptedCancellationPolicy}
        onChange={setAcceptedCancellationPolicy}
        hint="Free cancellation until 24 hours before the session. After that, a 50% cancellation fee applies."
      >
        I agree to LOBB&apos;s{" "}
        <ConsentLink href="/cancellation-policy">Cancellation Policy</ConsentLink> for this booking.
      </ConsentCheckbox>

      <BookingButton disabled={!canPay || !paystackReady} loading={paying} onClick={handlePay}>
        {paymentStage === "confirming" ? "Confirming your booking" : paying ? "Opening secure payment" : coach ? `Pay ${money(total)} securely` : "Loading booking summary"}
      </BookingButton>

      <p className="mt-4 text-center text-xs text-[var(--lobb-text-secondary)]">
        Pay securely without leaving this page · Powered by Paystack
      </p>
    </BookingShell>
    </>
  );
}

export default function BookingStepThreePage() {
  return (
    <Suspense fallback={null}>
      <BookingStep3Content />
    </Suspense>
  );
}
