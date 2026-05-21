"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, Info, MapPin, ShieldCheck } from "lucide-react";
import { BookingButton, BookingShell } from "@/components/booking-shell";
import { showLobbToast } from "@/components/lobb-global-state";
import { SkeletonBlock } from "@/components/lobb-skeleton";
import type { CoachPublicProfile } from "@/lib/types";

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
  if (seconds <= 120) return "bg-red-50 text-[var(--lobb-error)]";
  if (seconds <= 240) return "bg-[#fff7e0] text-[var(--lobb-warning)]";
  return "bg-[#fff0e8] text-[var(--lobb-clay)]";
}

function money(v: number) { return `₦${v.toLocaleString()}`; }

function BookingStep3Content() {
  const params = useParams<{ coachSlug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const slug   = params.coachSlug;

  const slot      = search.get("slot")     ?? "";
  const lockId    = search.get("lock")     ?? "";
  const expiresAt = search.get("expires")  ?? "";
  const location  = search.get("location") ?? "";
  const note      = search.get("note")     ?? "";

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
          coach_slug:    slug,
          slot_starts_at: slot,
          lock_id:       lockId,
          location,
          player_notes:  note || undefined,
        }),
      });
      const json = (await res.json()) as {
        booking_id?: string; reference?: string; paystack_url?: string; error?: string;
      };
      if (!res.ok || !json.paystack_url) {
        showLobbToast({ type: "error", message: json.error ?? "Could not initiate payment. Try again." });
        return;
      }
      window.location.href = json.paystack_url;
    } catch {
      showLobbToast({ type: "error", message: "Network error. Please try again." });
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
      <p className={`mb-5 rounded-full px-4 py-2 text-center text-sm font-black transition-colors duration-500 ${countdownStyle(seconds)}`}>
        {formatCountdown(seconds)} remaining
      </p>

      <h2 className="font-black">Order Summary</h2>

      <section className="mt-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_14px_34px_rgba(58,43,20,0.07)]">
        {/* Coach identity */}
        {coach && (
          <div className="mb-4 flex items-center gap-3">
            <div className="size-10 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
              {coach.profile_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--lobb-muted)]">Session with</p>
              <p className="font-black">{coach.full_name}</p>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="space-y-2 text-sm font-semibold text-[var(--lobb-muted)]">
          {slot && (
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              {formatSlotShort(slot)} – {formatSlotEnd(slot)}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" />
            60 minutes
          </p>
          {location && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
              {location}
            </p>
          )}
        </div>

        <div className="my-4 border-t border-[var(--lobb-border)]" />

        {/* Fee breakdown */}
        {coach ? (
          <>
            <div className="flex justify-between text-sm font-semibold">
              <span>Session fee</span>
              <span>{money(sessionFee)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm font-semibold text-[var(--lobb-muted)]">
              <span>LOBB fee (5%)</span>
              <span>{money(lobbFee)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--lobb-bg)] px-4 py-3">
              <span className="font-black">Total</span>
              <span className="font-black text-[var(--lobb-clay)]">{money(total)}</span>
            </div>
          </>
        ) : (
          <div className="space-y-3 py-2">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </div>
        )}
      </section>

      <p className="mt-5 flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--lobb-muted)]">
        <Info className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
        Payment is held in escrow until after your session. Full refund if cancelled 24 hrs before.
      </p>

      <BookingButton disabled={!coach || paying} onClick={handlePay}>
        {paying ? "Redirecting to payment..." : coach ? `Pay ${money(total)} securely` : "Loading…"}
      </BookingButton>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-[var(--lobb-muted)]">
        <ShieldCheck className="size-3.5" /> Secured by Paystack · Powered by LOBB
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
