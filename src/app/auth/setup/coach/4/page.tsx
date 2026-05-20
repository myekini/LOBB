"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/components/onboarding-shell";
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

    router.push("/auth/setup/coach/submitted");
    router.refresh();
  };

  return (
    <OnboardingShell step="4 of 4">
      <form onSubmit={submit} className="flex flex-1 flex-col pt-3">
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

        <div className="mt-8 space-y-7">
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Specializations <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpecializations((current) => toggle(spec, current))}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    specializations.includes(spec)
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Languages spoken <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setLanguages((current) => toggle(language, current))}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    languages.includes(language)
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Court access <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 space-y-2">
              {COURT_ACCESS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCourtAccess(option.value)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition ${
                    courtAccess === option.value
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {option.label}
                  {courtAccess === option.value && <CheckCircle2 className="size-5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Certifications <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 space-y-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCert(cert)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition ${
                    certifications.includes(cert)
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {cert}
                  {certifications.includes(cert) && (
                    <CheckCircle2 className="size-5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Demo video URL{" "}
              <span className="text-xs font-semibold text-[var(--lobb-muted)]">(optional)</span>
            </span>
            <input
              type="url"
              value={demoVideoUrl}
              onChange={(e) => setDemoVideoUrl(e.target.value)}
              placeholder="YouTube or Instagram link showing your coaching"
              className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:font-normal placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
          </label>
        </div>

        <div className="mt-auto pb-8">
          {error && <p className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving}>
            {saving ? "Submitting..." : "Submit for review"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
