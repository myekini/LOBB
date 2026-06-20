"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import type { CoachPublicProfile } from "@/lib/types";
import { track } from "@/lib/analytics";
import { readApiError, toastAppError } from "@/lib/client-errors";

const LOBB_FEE_RATE = 0.05;

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

  const handlePay = async () => {
    if (paying || !coach) return;
    setPaying(true);
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
        }),
      });
      if (!res.ok) {
        toastAppError(await readApiError(res, "PAYMENT_INIT_FAILED"), "PAYMENT_INIT_FAILED");
        return;
      }
      const json = (await res.json()) as {
        booking_id?: string; reference?: string; paystack_url?: string;
      };
      if (!json.paystack_url) {
        toastAppError(new Error("Could not initiate payment. Try again."), "PAYMENT_INIT_FAILED");
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
      window.location.href = json.paystack_url;
    } catch {
      toastAppError(null, "NETWORK_ERROR");
    } finally {
      setPaying(false);
    }
  };

  return (
    <BookingShell
      step={3}
      backHref={`/book/${slug}/step-2?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}`}
    >
      {/* Countdown */}
      <div className="lobb-app-card mb-4 overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Review & pay</p>
            <h2 className="mt-1 text-xl font-black text-[var(--lobb-text-primary)]">Confirm your session</h2>
          </div>
          <span className={`rounded-full px-3 py-2 text-xs font-black transition-colors duration-500 ${countdownStyle(seconds)}`}>
            {formatCountdown(seconds)}
          </span>
        </div>
        </div>
      </div>

      <section className="lobb-app-card overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        <div className="bg-[var(--lobb-bg-inverse)] p-5 text-[var(--lobb-text-inverse)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">Payment summary</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{coach ? money(total) : "Loading"}</h2>
              <p className="mt-1 text-xs font-semibold text-white/75">60-minute private coaching session</p>
            </div>
            <ShieldCheck className="size-7 text-[var(--lobb-clay)]" />
          </div>
        </div>
        <div className="p-4 sm:p-5">
        {/* Coach identity */}
        {coach && (
          <div className="mb-4 flex items-center gap-3.5 border-b border-[var(--lobb-border-subtle)] pb-4">
            <div className="size-14 shrink-0 overflow-hidden rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)]">
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
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-clay)]">Tennis Professional</p>
              <p className="text-base font-black tracking-tight text-[var(--lobb-text-primary)]">{coach.full_name}</p>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="grid gap-2 text-sm font-semibold text-[var(--lobb-text-secondary)]">
          {slot && (
            <div className="flex items-center gap-3 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
              <CalendarDays className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="text-[var(--lobb-text-primary)]">{formatSlotShort(slot)} - {formatSlotEnd(slot)}</span>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
            <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" />
            <span className="text-[var(--lobb-text-primary)]">60 minutes</span>
          </div>
          {location && (
            <div className="flex items-start gap-3 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="leading-relaxed text-[var(--lobb-text-primary)]">{location}</span>
            </div>
          )}
        </div>

        <div className="my-5 border-t border-dashed border-[var(--lobb-border-subtle)]" />

        {/* Fee breakdown */}
        {coach ? (
          <div className="space-y-3.5">
            <div className="flex justify-between text-sm font-semibold text-[var(--lobb-text-secondary)]">
              <span>Session fee</span>
              <span className="font-black text-[var(--lobb-text-primary)]">{money(sessionFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[var(--lobb-text-secondary)]">
              <span>LOBB service fee (5%)</span>
              <span className="font-black text-[var(--lobb-text-primary)]">{money(lobbFee)}</span>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between rounded-[12px] border border-[var(--lobb-clay)]/20 bg-[var(--lobb-clay-light)] px-4 py-4">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--lobb-text-primary)]">Total</span>
                <span className="text-xl font-black text-[var(--lobb-clay)]">{money(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-12 w-full rounded-2xl" />
          </div>
        )}
        </div>
      </section>

      {/* Cancellation policy */}
      <div className="mt-4 flex items-start gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 text-xs font-semibold leading-relaxed text-[var(--lobb-text-primary)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--lobb-text-tertiary)]">Cancellation policy</p>
          <p className="mt-1 font-medium text-[var(--lobb-text-secondary)]">Free cancellation up to 24 hours before the session. Cancel within 24 hours and 50% is refunded.</p>
        </div>
      </div>

      {/* Payment protection banner */}
      <div className="mt-4 flex items-start gap-3 border border-[var(--lobb-success)]/20 bg-[var(--lobb-success-soft)] p-4 text-xs font-semibold leading-relaxed text-[var(--lobb-text-primary)]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--lobb-success)]" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--lobb-success)]">Protected payment</p>
          <p className="mt-1 font-medium text-[var(--lobb-text-secondary)]">
            {coach
              ? `Your ${money(total)} is held safely and released to ${coach.full_name?.split(" ")[0]} after your session.`
              : "Your payment is held safely and released to the coach after your session."}
          </p>
        </div>
      </div>

      <BookingButton disabled={!coach} loading={paying} onClick={handlePay}>
        {paying ? "Opening Paystack" : coach ? `Pay ${money(total)} securely` : "Loading booking summary"}
      </BookingButton>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] font-black uppercase tracking-wider text-[var(--lobb-text-secondary)]">
        Secured by Paystack · Powered by LOBB
      </p>
    </BookingShell>
  );
}

export default function BookingStepThreePage() {
  return (
    <Suspense fallback={null}>
      <BookingStep3Content />
    </Suspense>
  );
}
