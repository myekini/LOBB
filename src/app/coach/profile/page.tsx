"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Eye, Send } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";

const sections = [
  { label: "Photo & Name", detail: "Emeka Okonkwo", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Headline", detail: "ITF Certified · VI & Lekki", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Bio", detail: "8 years of professional experience", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Demo Video", detail: "Upload required to go live", status: "missing", action: "Add", href: "/coach/create-profile" },
  { label: "Specializations", detail: "Beginners, Adults, Kids", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Certifications", detail: "ITF Level 2 Certified", status: "missing", action: "Add", href: "/coach/create-profile" },
  { label: "Locations", detail: "3 service areas active", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Rate", detail: "₦20,000 per session", status: "done", action: "Edit", href: "/coach/create-profile" },
  { label: "Court Access", detail: "Set court access details", status: "missing", action: "Set", href: "/coach/availability" },
  { label: "Bank Account", detail: "Required for payouts", status: "missing", action: "Add", href: "/coach/earnings" },
] as const;

export default function CoachProfilePage() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-36 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[var(--lobb-muted)]">Profile</p>
            <h1 className="text-[22px] font-black">65% complete</h1>
          </div>
          <span className="text-sm font-black text-[var(--lobb-clay)]">65%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--lobb-surface-2)]">
          <div className="h-full w-[65%] rounded-full bg-[var(--lobb-clay)]" />
        </div>

        <section className="mt-6 flex items-start gap-3 rounded-[18px] border border-[var(--lobb-border)] border-l-4 border-l-[#F4A228] bg-[var(--lobb-surface)] p-4">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-[#F4A228]" />
          <div>
            <p className="font-black">Profile under review</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">Usually takes 24–48 hours. You&apos;ll get an SMS when live.</p>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Required Details</h2>
          <Link href="/coach/profile/preview" className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--lobb-clay)]">
            <Eye className="size-3.5" />
            Preview
          </Link>
        </div>

        <section className="mt-3 overflow-hidden rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          {sections.map((section, index) => (
            <Link
              key={section.label}
              href={section.href}
              className={`flex items-center justify-between gap-3 p-4 transition hover:bg-[var(--lobb-bg)] ${index ? "border-t border-[var(--lobb-border)]" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {section.status === "done" ? (
                  <CheckCircle2 className="size-5 shrink-0 fill-[#e8f4ed] text-[var(--lobb-success)]" />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <span className="size-3 rounded-full bg-[var(--lobb-clay)]" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{section.label}</p>
                  <p className={`mt-1 truncate text-xs font-semibold ${section.status === "done" ? "text-[var(--lobb-muted)]" : "text-[var(--lobb-clay)]"}`}>
                    {section.detail}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs font-black text-[var(--lobb-muted)]">
                {section.action}
                <ChevronRight className="size-4" />
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
          <p className="flex items-center gap-2 font-black">
            <AlertTriangle className="size-4 text-[var(--lobb-clay)]" />
            Complete missing items first
          </p>
          <p className="mt-2 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">Completed profiles receive more booking requests and rank higher in coach search.</p>
        </section>

        <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]">
          Submit Profile for Review
          <Send className="size-4" />
        </button>
      </section>

      <CoachBottomNav active="profile" />
    </main>
  );
}
