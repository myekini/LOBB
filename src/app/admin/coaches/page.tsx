"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, PlayCircle, X } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/components/admin-shell";
import { adminCoachApprovals, money } from "@/lib/mock-data";

export default function AdminCoachApprovalsPage() {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <AdminShell active="Coach Approvals">
      <AdminBackHeader title={`Coach Approvals (${adminCoachApprovals.length} pending)`} />

      <section className="grid gap-4 lg:grid-cols-2">
        {adminCoachApprovals.map((coach) => (
          <article key={coach.slug} className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coach.photo} alt="" className="size-20 rounded-[18px] object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-black">{coach.name}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Submitted: {coach.submitted}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm">
              <Info label="Headline" value={coach.headline} />
              <Info label="Locations" value={coach.locations} />
              <Info label="Rate" value={`${money(coach.rate)}/hr`} />
              <Info label="Certifications" value={coach.certifications} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={coach.videoUrl} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--lobb-border)] px-4 text-xs font-black">
                <PlayCircle className="size-4" />
                Watch Video
              </a>
              <Link href={`/coaches/${coach.slug}`} target="_blank" className="inline-flex h-10 items-center rounded-full border border-[var(--lobb-border)] px-4 text-xs font-black">
                View full profile →
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lobb-success)] text-sm font-black text-white">
                <Check className="size-4" />
                Approve
              </button>
              <button onClick={() => setRejecting(coach.name)} className="flex h-12 items-center justify-center gap-2 rounded-full border border-red-300 text-sm font-black text-red-700">
                <X className="size-4" />
                Reject
              </button>
            </div>
          </article>
        ))}
      </section>

      {rejecting && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4 md:items-center" onClick={() => setRejecting(null)}>
          <section className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-surface)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.2)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-black">Reason for rejection</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">Tell {rejecting} what they need to fix.</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tell the coach what they need to fix."
              className="mt-4 h-28 w-full resize-none rounded-[18px] border border-[var(--lobb-border)] bg-white p-4 text-sm font-medium outline-none focus:border-[var(--lobb-black)]"
            />
            <button disabled={!reason.trim()} onClick={() => { setRejecting(null); setReason(""); }} className="mt-4 h-12 w-full rounded-full bg-[var(--lobb-black)] text-sm font-black text-white disabled:bg-[#cfc6b8]">
              Send Rejection
            </button>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--lobb-border)] pb-2 last:border-b-0">
      <dt className="font-black">{label}:</dt>
      <dd className="text-right font-semibold text-[var(--lobb-muted)]">{value}</dd>
    </div>
  );
}
