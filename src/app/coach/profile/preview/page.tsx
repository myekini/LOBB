"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, Eye, MapPin, Share2, Star } from "lucide-react";
import { getCoach, money } from "@/lib/mock-data";

export default function CoachProfilePreviewPage() {
  const router = useRouter();
  const coach = getCoach("emeka-okonkwo");

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-50 flex h-[64px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-black">Profile Preview</h1>
        <button className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Share">
          <Share2 className="size-4" />
        </button>
      </header>

      <section className="bg-[var(--lobb-surface)] px-5 py-3 text-center text-sm font-semibold text-[var(--lobb-muted)]">
        <span className="inline-flex items-center gap-2">
          <Eye className="size-4" />
          This is how players see your profile
        </span>
      </section>

      <section className="relative aspect-[4/5] overflow-hidden bg-[var(--lobb-surface-2)] sm:aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coach.hero} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lobb-clay)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
            LOBB Verified
          </span>
          <h2 className="mt-3 text-[28px] font-black leading-tight">{coach.name}</h2>
          <p className="text-sm font-semibold text-white/75">{coach.subtitle}</p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-6 grid max-w-md grid-cols-2 gap-3 px-5">
        <Stat label={`${coach.reviews} reviews`} value={String(coach.rating)} star />
        <Stat label="Experience" value={`${coach.years} years`} />
        <Stat label="Location" value="Lagos" />
        <Stat label="per session" value={money(coach.rate)} />
      </section>

      <section className="mx-auto max-w-md space-y-8 px-5 pt-8">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">About Coach</h3>
          <p className="mt-3 text-sm font-medium leading-6 text-[var(--lobb-muted)]">{coach.bio}</p>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Specializations</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {coach.specializations.map((item) => (
              <span key={item} className="rounded-full bg-[var(--lobb-surface)] px-4 py-2 text-sm font-black text-[var(--lobb-muted)]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-[14px] bg-white">
              <MapPin className="size-5 text-[var(--lobb-clay)]" />
            </div>
            <div>
              <p className="font-black">Lagos Country Club</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Ikeja, Lagos State</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--lobb-border)] py-8 text-center">
          <p className="text-xs font-semibold text-[var(--lobb-muted)]">Players will see a Book Session button here.</p>
        </div>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)]/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Link href="/coach/profile" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)]">
            <Edit3 className="size-4" />
            Edit Profile
          </Link>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label, star }: { value: string; label: string; star?: boolean }) {
  return (
    <div className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.08)]">
      <p className="flex items-center gap-1 text-sm font-black">
        {star && <Star className="size-4 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />}
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
