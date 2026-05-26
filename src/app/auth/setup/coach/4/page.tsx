"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  OnboardingButton,
  OnboardingCopy,
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
    router.push("/auth/setup/coach/submitted");
    router.refresh();
  };

  return (
    <OnboardingShell step="4 of 4">
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Specializations <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => setSpecializations((current) => toggle(spec, current))}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-[0.98] ${
                    specializations.includes(spec)
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-white/[0.08]"
                      : "border-transparent bg-white/[0.02] text-white/40 hover:text-white/80 hover:bg-white/[0.04] backdrop-blur-sm"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Languages spoken <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LANGUAGE_OPTIONS.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setLanguages((current) => toggle(language, current))}
                  className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all active:scale-[0.98] ${
                    languages.includes(language)
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-white/[0.08]"
                      : "border-transparent bg-white/[0.02] text-white/40 hover:text-white/80 hover:bg-white/[0.04] backdrop-blur-sm"
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Court access <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 space-y-2">
              {COURT_ACCESS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCourtAccess(option.value)}
                  className={`flex w-full items-center justify-between rounded-[16px] border px-5 py-4 text-left text-[14px] font-bold transition-all active:scale-[0.98] ${
                    courtAccess === option.value
                      ? "bg-[#D96B27]/10 text-white border-[#D96B27]/50 shadow-[0_0_24px_rgba(217,107,39,0.15)]"
                      : "border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white backdrop-blur-sm"
                  }`}
                >
                  {option.label}
                  {courtAccess === option.value && <CheckCircle2 className="size-5 shrink-0 text-[#D96B27]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Certifications <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 space-y-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => toggleCert(cert)}
                  className={`flex w-full items-center justify-between rounded-[16px] border px-5 py-4 text-left text-[14px] font-bold transition-all active:scale-[0.98] ${
                    certifications.includes(cert)
                      ? "bg-[#D96B27]/10 text-white border-[#D96B27]/50 shadow-[0_0_24px_rgba(217,107,39,0.15)]"
                      : "border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white backdrop-blur-sm"
                  }`}
                >
                  {cert}
                  {certifications.includes(cert) && (
                    <CheckCircle2 className="size-5 shrink-0 text-[#D96B27]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <label className="block group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Demo video URL{" "}
              <span className="text-white/30 normal-case font-semibold tracking-normal">(optional)</span>
            </span>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-5 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="YouTube or Instagram link showing your coaching"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-white outline-none placeholder:text-white/20 focus:ring-0"
              />
            </div>
          </label>
        </div>

        <div className="mt-10 pb-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-red-400">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving}>
            {saving ? "Submitting..." : "Submit for review"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
