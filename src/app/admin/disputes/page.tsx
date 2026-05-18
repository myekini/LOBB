"use client";

import { useState } from "react";
import { Gavel, Phone } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/components/admin-shell";
import { adminBookings, money } from "@/lib/mock-data";

type Resolution = "refund" | "release" | "split";

export default function AdminDisputesPage() {
  const [resolution, setResolution] = useState<Resolution>("refund");
  const booking = adminBookings.find((item) => item.status === "disputed") || adminBookings[0];

  return (
    <AdminShell active="Disputes">
      <AdminBackHeader title={`Dispute #${booking.id}`} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <Block title="Booking Details">
            <div className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
              <p className="font-mono text-xs font-black text-[var(--lobb-muted)]">#{booking.id}</p>
              <p className="mt-2 text-lg font-black">{booking.date}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">{booking.coach} ← {booking.player}</p>
              <p className="mt-3 font-black">{money(booking.amount)} held</p>
            </div>
          </Block>

          <Block title="Player's Claim">
            <blockquote className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium italic leading-6 text-[var(--lobb-muted)]">
              &quot;Coach did not show up for the session. I waited for 30 minutes and tried calling twice.&quot;
            </blockquote>
          </Block>

          <div className="grid gap-3 sm:grid-cols-2">
            <a href="tel:08123456789" className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              Contact Player
            </a>
            <a href="tel:08055528811" className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black">
              <Phone className="size-4 text-[var(--lobb-clay)]" />
              Contact Coach
            </a>
          </div>
        </section>

        <section className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          <h2 className="text-lg font-black">Resolution</h2>
          <div className="mt-5 space-y-3">
            <ResolutionOption value="refund" selected={resolution} setSelected={setResolution} title="Refund player in full" />
            <ResolutionOption value="release" selected={resolution} setSelected={setResolution} title="Release to coach" />
            <ResolutionOption value="split" selected={resolution} setSelected={setResolution} title="Split (specify %)" />
          </div>

          {resolution === "split" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-[var(--lobb-muted)]">
                Player %
                <input type="number" placeholder="50" className="mt-2 h-12 w-full rounded-[14px] border border-[var(--lobb-border)] bg-white px-3 font-black outline-none" />
              </label>
              <label className="text-xs font-black text-[var(--lobb-muted)]">
                Coach %
                <input type="number" placeholder="50" className="mt-2 h-12 w-full rounded-[14px] border border-[var(--lobb-border)] bg-white px-3 font-black outline-none" />
              </label>
            </div>
          )}

          <textarea placeholder="Internal resolution notes..." className="mt-5 h-28 w-full resize-none rounded-[18px] border border-[var(--lobb-border)] bg-white p-4 text-sm font-medium outline-none focus:border-[var(--lobb-black)]" />

          <button className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white">
            <Gavel className="size-4" />
            Apply Resolution
          </button>
        </section>
      </div>
    </AdminShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-black">{title}</h2>
      {children}
    </section>
  );
}

function ResolutionOption({ value, selected, setSelected, title }: { value: Resolution; selected: Resolution; setSelected: (value: Resolution) => void; title: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-[16px] border p-4 text-sm font-black ${selected === value ? "border-[var(--lobb-clay)] bg-[#fff0e8]" : "border-[var(--lobb-border)]"}`}>
      <input type="radio" checked={selected === value} onChange={() => setSelected(value)} className="size-4 accent-[var(--lobb-clay)]" />
      {title}
    </label>
  );
}
