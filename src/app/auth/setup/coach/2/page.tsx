"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/components/onboarding-shell";
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

    router.push("/auth/setup/coach/3");
  };

  return (
    <OnboardingShell step="2 of 4">
      <form onSubmit={next} className="flex flex-1 flex-col pt-3">
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

        <div className="mt-8 space-y-6">
          <label className="block">
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Bio <span className="text-[#ba1a1a]">*</span>
            </span>
            <span className="mt-1 block text-xs font-semibold text-[var(--lobb-muted)]">
              Minimum 50 characters. Aim for your coaching style, ideal player, and session structure.
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I'm an ITF-certified coach based in Lekki. I focus on adult beginners and intermediates — structured sessions, clear drills, and proper footwork from day one."
              maxLength={600}
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-3 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:font-normal placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
            <span
              className={`mt-1 block text-right text-xs font-bold ${
                bioLength < 50 ? "text-[#ba1a1a]" : "text-[var(--lobb-muted)]"
              }`}
            >
              {bioLength < 50 ? `${50 - bioLength} more characters needed` : `${bio.length}/600`}
            </span>
          </label>

          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Years coaching tennis <span className="text-[#ba1a1a]">*</span>
            </span>
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
              className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
            <p className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">
              Enter the actual number of years, not a range.
            </p>
          </div>
        </div>

        <div className="mt-auto pb-8">
          {error && <p className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving}>
            <span className="inline-flex items-center gap-2">
              {saving ? "Saving..." : "Next"} <ArrowRight className="size-4" />
            </span>
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
