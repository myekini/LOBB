"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";

export default function CoachSetupStep2Page() {
  const router = useRouter();
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [acceptedIdentityConsent, setAcceptedIdentityConsent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const ninClean = nin.replace(/\D/g, "").slice(0, 11);
  const bvnClean = bvn.replace(/\D/g, "").slice(0, 11);
  const canContinue = ninClean.length === 11 && bvnClean.length === 11 && acceptedIdentityConsent;

  const next = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/coaches/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin: ninClean, bvn: bvnClean, identity_consent_accepted: acceptedIdentityConsent }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save identity details");

      track("Coach Onboarding Step Completed", { step: 2 });
      router.push("/auth/setup/coach/3");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="2 of 6">
      <form onSubmit={next} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Verify your
            <br />
            identity
          </OnboardingTitle>
          <OnboardingCopy>
            LOBB moves real money to coaches. We&apos;re required to verify who you are before enabling payouts.
            Your NIN and BVN are never shared or stored in plain text.
          </OnboardingCopy>
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--lobb-clay)]" />
          <p className="text-[13px] font-medium leading-relaxed text-[var(--lobb-text-secondary)]">
            Your BVN is used to create your personal LOBB earnings account — a real bank account where your session payouts land.
            Your NIN confirms your identity once our verification provider is live.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <label className="block group">
            <OnboardingFieldLabel required hint={`${ninClean.length}/11`}>
              National Identification Number (NIN)
            </OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="11-digit NIN"
                autoComplete="off"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] font-bold tracking-[0.06em] text-[var(--lobb-text-primary)] outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[var(--lobb-text-secondary)]/70">
              Check your NIN slip, NIMC card, or dial <span className="font-mono">*347*3#</span> on your registered phone.
            </p>
          </label>

          <label className="block group">
            <OnboardingFieldLabel required hint={`${bvnClean.length}/11`}>
              Bank Verification Number (BVN)
            </OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="11-digit BVN"
                autoComplete="off"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] font-bold tracking-[0.06em] text-[var(--lobb-text-primary)] outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[var(--lobb-text-secondary)]/70">
              Dial <span className="font-mono">*565*0#</span> on your registered bank phone number.
            </p>
          </label>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-4 transition hover:border-[var(--lobb-clay)]/40">
          <input
            type="checkbox"
            checked={acceptedIdentityConsent}
            onChange={(event) => setAcceptedIdentityConsent(event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[var(--lobb-clay)]"
          />
          <span className="text-[12px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
            I consent to LOBB and its identity verification partner processing my NIN and BVN to confirm my identity. I understand this data is encrypted, stored securely, and retained for a minimum of 5 years as required by law. See our{" "}
            <Link href="/privacy" className="font-black text-[var(--lobb-clay)]">Privacy Policy</Link>.
          </span>
        </label>

        <div className="mt-auto pb-8 pt-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving} loading={saving}>
            {saving ? "Saving" : <span className="inline-flex items-center gap-2">Next <ArrowRight className="size-4" /></span>}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
