import Link from "next/link";
import { ArrowRight, GraduationCap, Trophy } from "lucide-react";
import { OnboardingCopy, OnboardingKicker, OnboardingShell, OnboardingTitle } from "@/features/auth/onboarding-shell";

const accountTypes = [
  {
    href: "/auth/signup/player",
    title: "Book tennis coaching",
    description: "Create a player account to find coaches and manage your sessions.",
    action: "Continue as a player",
    Icon: Trophy,
  },
  {
    href: "/auth/signup/coach",
    title: "Offer tennis coaching",
    description: "Apply as a coach, publish availability and receive bookings.",
    action: "Continue as a coach",
    Icon: GraduationCap,
  },
];

export default function CreateAccountPage() {
  return (
    <OnboardingShell backHref="/">
      <section className="flex flex-1 flex-col pb-10 pt-3">
        <OnboardingKicker>Create account</OnboardingKicker>
        <OnboardingTitle>How will you use LOBB?</OnboardingTitle>
        <OnboardingCopy>Choose one path now. Your account setup will match what you need to do.</OnboardingCopy>

        <div className="mt-8 space-y-3">
          {accountTypes.map(({ href, title, description, action, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-start gap-4 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 transition-colors hover:border-[var(--lobb-clay)]/50 hover:bg-[var(--lobb-clay-light)]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-clay)]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-[var(--lobb-text-primary)]">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--lobb-text-secondary)]">{description}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--lobb-clay)]">
                  {action}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-auto pt-10 text-center text-sm text-[var(--lobb-text-secondary)]">
          Already have an account? <Link href="/auth/login" className="font-medium text-[var(--lobb-clay)] hover:underline">Sign in</Link>
        </p>
      </section>
    </OnboardingShell>
  );
}
