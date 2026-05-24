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
      <div className="mb-4 rounded-[24px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
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

      <section className="rounded-[24px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)] sm:p-5">
        {/* Coach identity */}
        {coach && (
          <div className="mb-4 flex items-center gap-3.5 border-b border-[var(--lobb-border-subtle)] pb-4">
            <div className="size-12 shrink-0 overflow-hidden rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)]">
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
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--lobb-bg-secondary)] p-3">
              <CalendarDays className="size-4 shrink-0 text-[var(--lobb-clay)]" />
              <span className="text-[var(--lobb-text-primary)]">{formatSlotShort(slot)} - {formatSlotEnd(slot)}</span>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--lobb-bg-secondary)] p-3">
            <Clock3 className="size-4 shrink-0 text-[var(--lobb-clay)]" />
            <span className="text-[var(--lobb-text-primary)]">60 minutes</span>
          </div>
          {location && (
            <div className="flex items-start gap-3 rounded-2xl bg-[var(--lobb-bg-secondary)] p-3">
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
              <div className="flex items-center justify-between rounded-2xl border border-[var(--lobb-clay)]/20 bg-[var(--lobb-clay-light)] px-4 py-3.5">
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
      </section>

      {/* Escrow Shield Trust Banner */}
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4 text-xs font-semibold leading-relaxed text-emerald-950 shadow-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Protected payment</p>
          <p className="mt-1 font-medium text-emerald-800">
            LOBB holds payment securely and releases it after the session is completed.
          </p>
        </div>
      </div>

      <BookingButton disabled={!coach} loading={paying} onClick={handlePay}>
        {paying ? "Opening Paystack" : coach ? `Pay ${money(total)} Securely` : "Loading Booking Summary..."}
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
