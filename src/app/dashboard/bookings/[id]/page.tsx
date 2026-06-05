"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Circle, CreditCard, MapPin, MessageCircle, Phone, ReceiptText, ShieldCheck, UserRound, X } from "lucide-react";
import {
  durationMinutes,
  firstJoin,
  formatBookingDate,
  money,
  type DashboardBooking,
} from "@/lib/dashboard-client-types";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { cancellationPolicy } from "@/lib/lobb-money";
import { readApiError, toastAppError, toastAppSuccess } from "@/lib/client-errors";

function firstProfilePhone(value: DashboardBooking["coach_profile"]) {
  const profile = firstJoin(value);
  return profile?.phone_number ?? null;
}

function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [showCancel, setShowCancel] = useState(false);
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const coach = firstJoin(booking?.coaches);

  useEffect(() => {
    let alive = true;

    fetch(`/api/bookings/${params.id}`)
      .then(async (response) => {
        if (!response.ok) throw await readApiError(response, "NOT_FOUND");
        const payload = (await response.json()) as { booking?: DashboardBooking };
        if (!payload.booking) throw new Error("Booking not found");
        if (alive) setBooking(payload.booking);
      })
      .catch((error) => {
        toastAppError(error, "NOT_FOUND");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [params.id]);

  const cancelBooking = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by player from dashboard" }),
      });
      if (!response.ok) throw await readApiError(response, "UNKNOWN_ERROR");
      toastAppSuccess("Booking cancelled.");
      router.push("/dashboard");
    } catch (error) {
      toastAppError(error, "UNKNOWN_ERROR");
    } finally {
      setCancelling(false);
      setShowCancel(false);
    }
  };

  if (loading) {
    return (
      <main className="lobb-app-page min-h-screen px-4 pb-10 pt-5 text-[var(--lobb-text-primary)] sm:px-6 lg:pt-8">
        <section className="mx-auto max-w-5xl">
          <BookingCardSkeleton />
          <div className="mt-7 space-y-4">
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="lobb-app-page min-h-screen px-4 py-10 text-[var(--lobb-text-primary)] sm:px-6">
        <section className="mx-auto max-w-3xl">
          <h1 className="text-xl font-black">Booking not found</h1>
          <Link href="/dashboard" className="mt-5 block text-sm font-black text-[var(--lobb-clay)]">Back to bookings</Link>
        </section>
      </main>
    );
  }

  const payment = booking.payments?.[0];
  const isUpcoming = booking.status === "confirmed";
  const coachPhone = payment?.status === "paid" ? firstProfilePhone(booking.coach_profile) : null;
  const policy = cancellationPolicy(booking.starts_at, "player");
  const fullRefund = policy.refundPercent === 100;
  const policyNote = policy.note;

  return (
    <main className="lobb-app-page min-h-screen px-4 pb-10 pt-5 text-[var(--lobb-text-primary)] sm:px-6 lg:pt-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3">
          <Link href="/dashboard/bookings" className="flex size-11 items-center justify-center rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-center font-black">Booking detail</h1>
          <div aria-hidden="true" />
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <section className="overflow-hidden border border-[var(--lobb-bg-inverse)] bg-[var(--lobb-bg-inverse)] p-5 text-[var(--lobb-text-inverse)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] opacity-55">
                <CalendarDays className="size-4 text-[var(--lobb-clay)]" />
                Session
              </p>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black capitalize">
                  <Circle className="size-2 fill-current text-[var(--lobb-clay)]" />
                  {booking.status.replaceAll("_", " ")}
                </span>
              </div>
              <h2 className="mt-3 text-[27px] font-black leading-none sm:text-[36px]">{formatBookingDate(booking.starts_at)}</h2>
              <p className="mt-3 text-sm font-semibold opacity-60">
                {durationMinutes(booking.starts_at, booking.ends_at)} minutes · {money(booking.total_amount_ngn)} paid
              </p>
            </section>

            <section className="lobb-app-card mt-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)]">
                  {coach?.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[var(--lobb-text-secondary)]">
                      <UserRound className="size-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">Coach</p>
                  <p className="mt-1 truncate text-base font-black">{coach?.full_name ?? "Coach"}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--lobb-text-secondary)]">{coach?.headline || coach?.primary_location || "Tennis coach"}</p>
                  {coach?.slug && (
                    <Link href={`/coaches/${coach.slug}`} className="mt-2 inline-flex text-xs font-black text-[var(--lobb-clay)] hover:underline">
                      View profile
                    </Link>
                  )}
                </div>
              </div>

              {coachPhone ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={`tel:${coachPhone.replace(/\s/g, "")}`} className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-xs font-black text-[var(--lobb-text-inverse)]">
                    <Phone className="size-4 text-[var(--lobb-clay)]" /> Call
                  </a>
                  <a href={`https://wa.me/${toWhatsAppNumber(coachPhone)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-xs font-black">
                    <MessageCircle className="size-4 text-[var(--lobb-clay)]" /> WhatsApp
                  </a>
                </div>
              ) : null}
            </section>

            <section className="lobb-app-card mt-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
              <InfoRow icon={MapPin} label="Location" value={booking.location || "Location not specified"} />
              {booking.player_notes && (
                <div className="mt-4 border-t border-[var(--lobb-border-subtle)] pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Note to coach</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">&quot;{booking.player_notes}&quot;</p>
                </div>
              )}
            </section>
          </div>

          <aside className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 lg:sticky lg:top-6">
        <DetailSection title="Payment" compact>
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
            <CreditCard className="size-4 text-[var(--lobb-clay)]" />
            {payment?.status ?? "pending"}
          </p>
          <PaymentRow amount={booking.hourly_rate_ngn} label="Session fee" />
          <PaymentRow amount={booking.convenience_fee_ngn ?? booking.platform_fee_ngn} label="Convenience fee" />
          <PaymentRow amount={booking.total_amount_ngn} label="Total paid" strong />
          <p className="mt-3 break-all rounded-[14px] bg-[var(--lobb-bg-primary)] px-3 py-2 text-xs font-bold text-[var(--lobb-text-secondary)]">Ref: {payment?.paystack_reference ?? booking.id}</p>
        </DetailSection>

        <DetailSection title="Cancellation policy">
          <div className={`rounded-[16px] border p-4 ${fullRefund ? "border-[var(--lobb-success)]/20 bg-[var(--lobb-success-soft)]" : policy.refundPercent === 50 ? "border-[var(--lobb-warning)]/25 bg-[var(--lobb-warning)]/10" : "border-[var(--lobb-error)]/20 bg-[var(--lobb-error)]/10"}`}>
            <p className="flex items-start gap-2 text-sm font-black">
              <ShieldCheck className="mt-0.5 size-4 text-[var(--lobb-clay)]" />
              {policy.label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">{policyNote}</p>
          </div>
        </DetailSection>

        {isUpcoming && (
          <button onClick={() => setShowCancel(true)} className="mt-6 h-12 w-full rounded-[12px] border border-[var(--lobb-error)]/35 bg-transparent text-sm font-black text-[var(--lobb-error)]">
            Cancel booking
          </button>
        )}

        <Link href={`/dashboard/bookings/${booking.id}/receipt${payment?.paystack_reference ? `?reference=${encodeURIComponent(payment.paystack_reference)}` : ""}`} className="mt-3 flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-sm font-black">
          <ReceiptText className="size-4 text-[var(--lobb-clay)]" />
          View receipt
        </Link>
        <Link href="/dashboard" className="mt-4 block text-center text-sm font-bold text-[var(--lobb-text-secondary)]">
          Back to bookings
        </Link>
          </aside>
        </div>
      </section>

      {showCancel && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4" onClick={() => setShowCancel(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-booking-title"
            className="mx-auto w-full max-w-md border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-modal)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="cancel-booking-title" className="text-lg font-black">Cancel this booking?</h2>
              <button type="button" onClick={() => setShowCancel(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
              <strong>{policy.label}.</strong> {policyNote}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowCancel(false)} className="h-12 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]">
                Keep booking
              </button>
              <button type="button" disabled={cancelling} onClick={cancelBooking} className="h-12 rounded-[12px] border border-[var(--lobb-error)]/35 text-sm font-black text-[var(--lobb-error)] disabled:opacity-60">
                {cancelling ? "Cancelling" : "Cancel booking"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function DetailSection({ title, children, compact }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={compact ? "" : "mt-7"}>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-text-tertiary)]">{title}</span>
        <span className="h-px flex-1 bg-[var(--lobb-border-subtle)]" />
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">{label}</span>
        <span className="mt-1 block text-sm font-black leading-6">{value}</span>
      </span>
    </div>
  );
}

function PaymentRow({ amount, label, strong }: { amount: number; label: string; strong?: boolean }) {
  return (
    <p className={`flex items-center justify-between gap-5 py-1.5 text-sm ${strong ? "font-black text-[var(--lobb-text-primary)]" : "font-semibold text-[var(--lobb-text-secondary)]"}`}>
      <span>{label}</span>
      <span className="font-black text-[var(--lobb-text-primary)]">{money(amount)}</span>
    </p>
  );
}
