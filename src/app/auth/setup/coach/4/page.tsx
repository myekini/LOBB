"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import {
  CERTIFICATION_OPTIONS,
  COURT_ACCESS_OPTIONS,
  LANGUAGE_OPTIONS,
  SPECIALIZATION_OPTIONS,
  type CourtAccess,
} from "@/lib/types";

function toggle(value: string, list: string[]) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function CoachSetupStep4Page() {
  const router = useRouter();
  const [certifications, setCertifications] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [courtAccess, setCourtAccess] = useState<CourtAccess | "">("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue =
    certifications.length > 0 &&
    specializations.length > 0 &&
    languages.length > 0 &&
    Boolean(courtAccess);

  const toggleCert = (cert: string) => {
    if (cert === "No formal certification") {
      setCertifications((prev) => (prev.includes(cert) ? [] : ["No formal certification"]));
      return;
    }
    // Selecting any real cert deselects "No formal certification"
    setCertifications((prev) => {
      const without = prev.filter((c) => c !== "No formal certification");
      return without.includes(cert) ? without.filter((c) => c !== cert) : [...without, cert];
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinue) return;

    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Session expired. Please log in again.");
      return;
    }

    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .update({
        certifications,
        specializations,
        languages,
        court_access: courtAccess,
        demo_video_url: demoVideoUrl.trim() || null,
        status: "pending_review",
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    setSaving(false);

    if (coachError) {
      setError(coachError.message);
      return;
    }

    if (!coach) {
      setError("Start with step 1 so we can create your coach draft first.");
      router.push("/auth/setup/coach/1");
      return;
    }

    track("Coach Profile Submitted");
    router.push("/auth/setup/coach/bank");
    router.refresh();
  };

  return (
    <OnboardingShell step="4 of 5">
      <form onSubmit={submit} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Final details
            <br />&amp; submit
          </OnboardingTitle>
          <OnboardingCopy>
            Add the details players use to decide if you&apos;re the right fit. Then we&apos;ll review your
            profile before it goes live.
          </OnboardingCopy>
        </section>

        <div className="mt-8 space-y-6">
          <div className="group">
            <OnboardingFieldLabel required>Specializations</OnboardingFieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpecializations((current) => toggle(spec, current))}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full border px-[18px] py-2.5 text-center text-[12px] font-black leading-tight transition-all active:scale-[0.97] ${
                    specializations.includes(spec)
                      ? "bg-[var(--lobb-clay)] text-white shadow-[0_4px_16px_rgba(196,98,45,0.12)] border-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <OnboardingFieldLabel required>Languages spoken</OnboardingFieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setLanguages((current) => toggle(language, current))}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full border px-[18px] py-2.5 text-center text-[12px] font-black leading-tight transition-all active:scale-[0.97] ${
                    languages.includes(language)
                      ? "bg-[var(--lobb-clay)] text-white shadow-[0_4px_16px_rgba(196,98,45,0.12)] border-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <OnboardingFieldLabel required>Court access</OnboardingFieldLabel>
            <div className="mt-3 space-y-2.5">
              {COURT_ACCESS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCourtAccess(option.value)}
                  className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-[16px] border px-5 py-[18px] text-left text-[14px] font-bold leading-snug transition-all active:scale-[0.97] ${
                    courtAccess === option.value
                      ? "bg-[var(--lobb-clay)]/[0.08] text-[var(--lobb-text-primary)] border-[var(--lobb-clay)]/50 shadow-[0_0_24px_rgba(196,98,45,0.08)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-surface)] hover:text-[var(--lobb-text-primary)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {option.label}
                  {courtAccess === option.value && <CheckCircle2 className="size-5 shrink-0 text-[var(--lobb-clay)]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <OnboardingFieldLabel required>Certifications</OnboardingFieldLabel>
            <div className="mt-3 space-y-2.5">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCert(cert)}
                  className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-[16px] border px-5 py-[18px] text-left text-[14px] font-bold leading-snug transition-all active:scale-[0.97] ${
                    certifications.includes(cert)
                      ? "bg-[var(--lobb-clay)]/[0.08] text-[var(--lobb-text-primary)] border-[var(--lobb-clay)]/50 shadow-[0_0_24px_rgba(196,98,45,0.08)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-surface)] hover:text-[var(--lobb-text-primary)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {cert}
                  {certifications.includes(cert) && (
                    <CheckCircle2 className="size-5 shrink-0 text-[var(--lobb-clay)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="block group">
            <OnboardingFieldLabel hint="optional">Demo video URL</OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="YouTube or Instagram link showing your coaching"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
          </label>
        </div>

        <div className="mt-10 pb-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving}>
            {saving ? "Submitting..." : "Submit for review"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
