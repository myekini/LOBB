"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { createClient } from "@/lib/supabase/client";

export default function CoachSetupStep2Page() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const bioLength = bio.trim().length;
  const canContinue = bioLength >= 50 && experienceYears !== null && experienceYears >= 0 && experienceYears <= 60;

  const next = async (event: React.FormEvent) => {
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
      .update({ bio: bio.trim(), experience_years: experienceYears })
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

    track("Coach Onboarding Step Completed", { step: 2 });
    router.push("/auth/setup/coach/3");
  };

  return (
    <OnboardingShell step="2 of 4">
      <form onSubmit={next} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Your story &amp;
            <br />
            experience
          </OnboardingTitle>
          <OnboardingCopy>
            Players read your bio to decide if you&apos;re the right fit. Be specific — mention your coaching
            style and what a typical session looks like.
          </OnboardingCopy>
        </section>

        <div className="mt-8 space-y-7">
          <label className="block group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Bio <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <span className="mt-2 block text-[12px] font-medium text-white/40 leading-relaxed">
              Minimum 50 characters. Aim for your coaching style, ideal player, and session structure.
            </span>
            <div className="mt-3 relative flex overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm an ITF-certified coach based in Lekki. I focus on adult beginners and intermediates — structured sessions, clear drills, and proper footwork from day one."
                maxLength={600}
                rows={6}
                className="relative z-10 w-full resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed font-medium text-white outline-none placeholder:text-white/20 focus:ring-0"
              />
            </div>
            <span
              className={`mt-2 block text-right text-[11px] font-bold tracking-wide ${
                bioLength < 50 ? "text-red-400" : "text-white/30"
              }`}
            >
              {bioLength < 50 ? `${50 - bioLength} more characters needed` : `${bio.length}/600`}
            </span>
          </label>

          <label className="block group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Years coaching tennis <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-5 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                step={1}
                value={experienceYears ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setExperienceYears(value === "" ? null : Number(value));
                }}
                placeholder="5"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-white outline-none placeholder:text-white/20 focus:ring-0"
              />
            </div>
            <p className="mt-3 text-[11px] font-medium text-white/40">
              Enter the actual number of years, not a range.
            </p>
          </label>
        </div>

        <div className="mt-auto pb-8 pt-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-red-400">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue} loading={saving}>
            {saving ? "Saving" : <span className="inline-flex items-center gap-2">Next <ArrowRight className="size-4" /></span>}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
