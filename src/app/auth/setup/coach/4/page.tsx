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

const CERT_OPTIONS = [
  "ITF Level 1",
  "ITF Level 2",
  "ITF Level 3",
  "LTA Level 1",
  "LTA Level 2",
  "LTA Level 3",
  "USPTA",
  "PTR",
  "No formal certification",
];

export default function CoachSetupStep4Page() {
  const router = useRouter();
  const [certifications, setCertifications] = useState<string[]>([]);
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = certifications.length > 0;

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

    const { error: coachError } = await supabase
      .from("coaches")
      .update({
        certifications,
        demo_video_url: demoVideoUrl.trim() || null,
        status: "pending_review",
      })
      .eq("id", user.id);

    setSaving(false);

    if (coachError) {
      setError(coachError.message);
      return;
    }

    router.push("/coach/dashboard");
    router.refresh();
  };

  return (
    <OnboardingShell step="4 of 4">
      <form onSubmit={submit} className="flex flex-1 flex-col pt-3">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Credentials
            <br />&amp; submit
          </OnboardingTitle>
          <OnboardingCopy>
            Add your certifications then submit. Our team reviews every profile before it goes live
            — usually within 24 hours.
          </OnboardingCopy>
        </section>

        <div className="mt-8 space-y-7">
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Certifications <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 space-y-2">
              {CERT_OPTIONS.map((cert) => (
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
          <OnboardingButton type="submit" disabled={!canContinue}>
            {saving ? "Submitting..." : "Submit for review"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
