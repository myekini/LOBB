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
      <main className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <div className="mb-6 flex size-[60px] items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#1DB954] shadow-[0_0_32px_rgba(29,185,84,0.15)]">
            <CheckCircle2 className="size-8" />
          </div>
          <OnboardingKicker>Submitted for review</OnboardingKicker>
          <OnboardingTitle>
            We&apos;re checking
            <br />
            your profile
          </OnboardingTitle>
          <OnboardingCopy>
            Your coach profile is in the LOBB review queue. Reviews usually take 24–48 hours, and
            we&apos;ll notify you by email when your profile goes live.
          </OnboardingCopy>
        </section>

        <section className="mt-10 space-y-4">
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Clock3 className="size-16" />
            </div>
            <p className="relative z-10 flex items-center gap-3 text-[14px] font-black tracking-wide text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#D96B27]/20 text-[#D96B27]">
                <Clock3 className="size-4" />
              </span>
              What happens next
            </p>
            <p className="relative z-10 mt-3 text-[13px] font-medium leading-relaxed text-white/50">
              Our team checks your photo, coaching details, rate, locations, and credentials before
              players can book you.
            </p>
          </div>
          
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm transition-all hover:bg-white/[0.04]">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Settings className="size-16" />
            </div>
            <p className="relative z-10 flex items-center gap-3 text-[14px] font-black tracking-wide text-white">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#D96B27]/20 text-[#D96B27]">
                <Settings className="size-4" />
              </span>
              While you wait
            </p>
            <p className="relative z-10 mt-3 text-[13px] font-medium leading-relaxed text-white/50">
              You can preview your public profile, add availability, or update details from your
              coach dashboard.
            </p>
          </div>
        </section>

        <div className="mt-auto space-y-4 pb-8 pt-10 relative z-10">
          <Link
            href="/coach/profile/preview"
            className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-[16px] bg-[#D96B27] text-[15px] font-bold tracking-wide text-white transition-all hover:scale-[1.02] hover:bg-[#E87A36] active:scale-[0.98]"
          >
            <Eye className="size-5 transition-transform group-hover:scale-110" />
            Preview profile
          </Link>
          <Link
            href="/coach/dashboard"
            className="flex h-14 w-full items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.02] text-[15px] font-bold tracking-wide text-white transition-all hover:bg-white/[0.04] active:scale-[0.98]"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </OnboardingShell>
  );
}
