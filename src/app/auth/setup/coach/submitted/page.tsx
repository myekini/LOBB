import Link from "next/link";
import { CheckCircle2, Clock3, Eye, Settings } from "lucide-react";
import {
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";

export default function CoachSubmittedPage() {
  return (
    <OnboardingShell showBack={false}>
      <main className="flex flex-1 flex-col pt-3">
        <section>
          <div className="mb-6 flex size-14 items-center justify-center rounded-full bg-[#e8f4ed] text-[var(--lobb-success)]">
            <CheckCircle2 className="size-7" />
          </div>
          <OnboardingKicker>Submitted for review</OnboardingKicker>
          <OnboardingTitle>
            We&apos;re checking
            <br />
            your profile
          </OnboardingTitle>
          <OnboardingCopy>
            Your coach profile is in the LOBB review queue. Reviews usually take 24–48 hours, and
            we&apos;ll notify you by SMS when your profile goes live.
          </OnboardingCopy>
        </section>

        <section className="mt-8 space-y-3">
          <div className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <Clock3 className="size-4 text-[var(--lobb-clay)]" />
              What happens next
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
              Our team checks your photo, coaching details, rate, locations, and credentials before
              players can book you.
            </p>
          </div>
          <div className="rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <Settings className="size-4 text-[var(--lobb-clay)]" />
              While you wait
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
              You can preview your public profile, add availability, or update details from your
              coach dashboard.
            </p>
          </div>
        </section>

        <div className="mt-auto space-y-3 pb-8">
          <Link
            href="/coach/profile/preview"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white"
          >
            <Eye className="size-4" />
            Preview profile
          </Link>
          <Link
            href="/coach/dashboard"
            className="flex h-14 w-full items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black text-[var(--lobb-black)]"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </OnboardingShell>
  );
}
