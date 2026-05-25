"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, MapPin, Printer, ReceiptText, UserRound } from "lucide-react";
import { BookingCardSkeleton } from "@/components/common/lobb-skeleton";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";

function formatPaidAt(iso: string | null | undefined) {
  if (!iso) return "Payment confirmed";
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });
}

export default function BookingReceiptPage() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch(`/api/bookings/${params.id}`)
      .then(async (response) => {
        const payload = (await response.json()) as { booking?: DashboardBooking; error?: string };
        if (!response.ok || !payload.booking) throw new Error(payload.error ?? "Receipt not found");
        if (alive) setBooking(payload.booking);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load receipt" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [params.id]);

  const payment = booking?.payments?.[0];
  const coach = firstJoin(booking?.coaches);
  const player = firstJoin(booking?.players);
  const receiptId = payment?.paystack_reference ?? booking?.paystack_reference ?? booking?.id ?? "";
  const rows = useMemo(
    () => [
      { label: "Coach session", amount: booking?.hourly_rate_ngn ?? 0 },
      { label: "LOBB convenience fee", amount: booking?.convenience_fee_ngn ?? booking?.platform_fee_ngn ?? 0 },
    ],
    [booking]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-4 py-8 text-[var(--lobb-text-primary)]">
        <section className="mx-auto max-w-3xl">
          <BookingCardSkeleton />
          <div className="mt-5">
            <BookingCardSkeleton />
          </div>
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-4 py-10 text-[var(--lobb-text-primary)]">
        <section className="mx-auto max-w-2xl">
          <h1 className="text-xl font-black">Receipt not found</h1>
          <Link href="/dashboard" className="mt-5 inline-flex text-sm font-black text-[var(--lobb-clay)]">Back to dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-4 py-6 text-[var(--lobb-text-primary)] print:bg-white print:px-0 print:py-0">
      <section className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-3 print:hidden">
          <Link href={`/dashboard/bookings/${booking.id}`} className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]" aria-label="Back to booking">
            <ArrowLeft className="size-5" />
          </Link>
          <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--lobb-bg-inverse)] px-4 text-sm font-black text-[var(--lobb-text-inverse)]">
            <Printer className="size-4" />
            Print
          </button>
        </header>

        <article className="overflow-hidden rounded-[28px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-card)] print:rounded-none print:border-0 print:shadow-none">
          <section className="border-b border-[var(--lobb-border-subtle)] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--lobb-clay)]">LOBB receipt</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Thanks for your payment</h1>
                <p className="mt-2 text-sm font-semibold text-[var(--lobb-text-secondary)]">Your Lagos tennis session is confirmed and recorded.</p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-clay)]">
                <ReceiptText className="size-6" />
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Total paid</p>
                <p className="mt-2 text-5xl font-black tracking-tight">{money(booking.total_amount_ngn)}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe7d8] bg-[#eef8f2] px-3 py-2 text-xs font-black text-[var(--lobb-success)]">
                <CheckCircle2 className="size-4" />
                {payment?.status ?? "paid"}
              </span>
            </div>
          </section>

          <section className="grid gap-0 border-b border-[var(--lobb-border-subtle)] sm:grid-cols-2">
            <ReceiptBlock icon={CalendarDays} label="Session" value={formatBookingDate(booking.starts_at)} />
            <ReceiptBlock icon={UserRound} label="Coach" value={coach?.full_name ?? "Coach"} />
            <ReceiptBlock icon={MapPin} label="Location" value={booking.location || "Location not specified"} />
            <ReceiptBlock icon={CreditCard} label="Payment" value={formatPaidAt(payment?.paid_at)} />
          </section>

          <section className="p-6 sm:p-8">
            <div className="space-y-4">
              {rows.map((row) => (
                <p key={row.label} className="flex items-center justify-between gap-5 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                  <span>{row.label}</span>
                  <span className="font-black text-[var(--lobb-text-primary)]">{money(row.amount)}</span>
                </p>
              ))}
              <p className="flex items-center justify-between gap-5 border-t border-[var(--lobb-border-subtle)] pt-5 text-base font-black">
                <span>Total</span>
                <span>{money(booking.total_amount_ngn)}</span>
              </p>
            </div>

            <div className="mt-8 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-text-tertiary)]">Receipt ID</p>
              <p className="mt-2 break-all font-mono text-sm font-black">{receiptId}</p>
            </div>

            <div className="mt-8 grid gap-4 text-sm font-semibold text-[var(--lobb-text-secondary)] sm:grid-cols-2">
              <p><span className="font-black text-[var(--lobb-text-primary)]">Player:</span> {player?.full_name ?? "Player"}</p>
              <p><span className="font-black text-[var(--lobb-text-primary)]">Booking:</span> {booking.id}</p>
            </div>
          </section>
        </article>
      </section>
    </main>
  );
}

function ReceiptBlock({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="border-b border-[var(--lobb-border-subtle)] p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">
        <Icon className="size-4 text-[var(--lobb-clay)]" />
        {label}
      </p>
      <p className="mt-2 text-sm font-black leading-6">{value}</p>
    </div>
  );
}
