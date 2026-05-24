"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { BookingButton, BookingShell } from "@/features/booking/booking-shell";
import { showLobbToast } from "@/providers/lobb-global-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
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
  return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]";
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
  const venueId   = search.get("venue_id") ?? "";
  const courtId   = search.get("court_id") ?? "";

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
          location_venue_id: venueId || undefined,
          location_court_id: courtId || undefined,
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
      backHref={`/book/${slug}/step-2?slot=${encodeURIComponent(slot)}&lock=${lockId}&expires=${encodeURIComponent(expiresAt)}${venueId ? `&venue_id=${venueId}` : ""}${courtId ? `&court_id=${courtId}` : ""}`}
    >
      {/* Countdown */}
      <p className={`mb-5 rounded-full px-4 py-2 text-center text-sm font-black transition-colors duration-500 ${countdownStyle(seconds)}`}>
        {formatCountdown(seconds)} remaining
      </p>

      <h2 className="text-sm font-black uppercase tracking-wider text-[var(--lobb-black)]">Order Summary</h2>

      <section className="mt-3 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-5.5 shadow-[var(--lobb-shadow-card)]">
        {/* Coach identity */}
        {coach && (
          <div className="mb-4 flex items-center gap-3.5 pb-4 border-b border-[var(--lobb-border)]">
            <div className="size-11 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
              {coach.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center font-bold text-[var(--lobb-muted)] bg-[var(--lobb-surface-2)]">
                  {coach.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-clay)]">Tennis Professional</p>
              <p className="text-base font-black text-[var(--lobb-black)] tracking-tight">{coach.full_name}</p>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="space-y-3 text-sm font-semibold text-[var(--lobb-muted)]">
          {slot && (
            <p className="flex items-center gap-2.5">
              <CalendarDays className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="text-[var(--lobb-black)]">{formatSlotShort(slot)} – {formatSlotEnd(slot)}</span>
            </p>
          )}
          <p className="flex items-center gap-2.5">
            <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" />
            <span className="text-[var(--lobb-black)]">60 minutes standard session</span>
          </p>
          {location && (
            <p className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="text-[var(--lobb-black)] leading-relaxed">{location}</span>
            </p>
          )}
        </div>

        <div className="my-5 border-t border-dashed border-[var(--lobb-border)]" />

        {/* Fee breakdown */}
        {coach ? (
          <div className="space-y-3.5">
            <div className="flex justify-between text-sm font-semibold text-[var(--lobb-muted)]">
              <span>Session fee</span>
              <span className="text-[var(--lobb-black)] font-black">{money(sessionFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[var(--lobb-muted)]">
              <span>LOBB service fee (5%)</span>
              <span className="text-[var(--lobb-black)] font-black">{money(lobbFee)}</span>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between rounded-2xl bg-[var(--lobb-clay)]/5 px-4.5 py-3.5 border border-[var(--lobb-clay)]/15">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--lobb-black)]">Total to Pay</span>
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
      </section>

      {/* Escrow Shield Trust Banner */}
      <div className="mt-5 rounded-2xl bg-emerald-500/[0.04] p-4.5 border border-emerald-500/10 flex gap-3 items-start text-xs font-semibold text-emerald-950 leading-relaxed shadow-sm">
        <ShieldCheck className="size-5 shrink-0 text-emerald-600 mt-0.5 animate-pulse" />
        <div>
          <p className="font-black text-emerald-900 uppercase tracking-wider text-[10px]">Escrow Protection Active</p>
          <p className="mt-1 text-emerald-800 font-medium">
            Your payment is safely held in escrow and only released to the coach after your session is completed. Cancel for free up to 24 hours prior.
          </p>
        </div>
      </div>

      <BookingButton disabled={!coach} loading={paying} onClick={handlePay}>
        {paying ? "Opening Paystack" : coach ? `Pay ${money(total)} Securely` : "Loading Booking Summary..."}
      </BookingButton>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] font-black uppercase tracking-wider text-[var(--lobb-muted)]">
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
