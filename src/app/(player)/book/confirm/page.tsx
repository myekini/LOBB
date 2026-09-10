"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";
import { LobbBrandLoader } from "@/components/common/lobb-skeleton";
import { BookingStatusScreen } from "@/features/booking/booking-status-screen";
import { track } from "@/lib/analytics";
import { appError, type AppErrorPayload } from "@/lib/app-errors";
import { readApiError, toastAppError } from "@/lib/client-errors";
import type { BookingWithDetails } from "@/lib/types";

function BookingConfirmContent() {
  const search = useSearchParams();
  const router = useRouter();
  const reference = search.get("reference") ?? search.get("trxref");
  const [state, setState] = useState<"loading" | "failed" | "pending">("loading");
  const [confirmError, setConfirmError] = useState<AppErrorPayload | null>(null);

  useEffect(() => {
    if (!reference) {
      setConfirmError(appError("PAYMENT_NOT_FOUND"));
      setState("pending");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const verify = () => {
      attempts += 1;
      fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
        .then(async (response) => {
          if (response.status === 402) {
            const error = await readApiError(response, "PAYMENT_FAILED");
            if (!cancelled) { setConfirmError(error); setState("failed"); }
            return;
          }
          if (!response.ok) throw await readApiError(response, "PAYMENT_VERIFY_FAILED");
          const payload = (await response.json()) as { booking?: BookingWithDetails };
          if (!payload.booking || (payload.booking.status !== "confirmed" && payload.booking.payment_status !== "paid")) throw appError("PAYMENT_PENDING");
          if (cancelled) return;
          track("Booking Confirmed", { booking_id: payload.booking.id, coach_slug: payload.booking.coach_slug, total_paid: payload.booking.total_amount_ngn, reference });
          router.replace(`/dashboard/bookings/${payload.booking.id}?confirmed=1`);
        })
        .catch((error) => {
          if (cancelled) return;
          if (attempts < 12) {
            window.setTimeout(verify, attempts <= 3 ? attempts * 1500 : Math.min(attempts * 2000, 7000));
            return;
          }
          setConfirmError(toastAppError(error, "PAYMENT_VERIFY_FAILED"));
          setState("pending");
        });
    };
    verify();
    return () => { cancelled = true; };
  }, [reference, router]);

  if (state === "loading") return <LobbBrandLoader message="Confirming your payment…" />;
  if (state === "failed") {
    return <BookingStatusScreen icon={<span className="inline-flex size-16 items-center justify-center rounded-full border border-[var(--lobb-error)]/20 bg-[var(--lobb-error)]/10"><CreditCard className="size-8 text-[var(--lobb-error)]" /></span>} title="Payment not completed" body="No charge was made. Choose the booking to try again." error={confirmError} errorFallbackCode="PAYMENT_FAILED" primary={{ href: "/dashboard/bookings", label: "My bookings" }} secondary={{ href: "/coaches", label: "Browse coaches" }} />;
  }
  return <BookingStatusScreen title="Still confirming your payment" body="This usually takes under a minute. Your booking will appear as confirmed as soon as the payment clears." error={confirmError} errorFallbackCode="PAYMENT_PENDING" reference={reference} primary={{ href: "/dashboard/bookings", label: "Go to my bookings" }} secondary={{ href: "/home", label: "Back to home" }} />;
}

export default function BookingConfirmPage() {
  return <Suspense fallback={null}><BookingConfirmContent /></Suspense>;
}
