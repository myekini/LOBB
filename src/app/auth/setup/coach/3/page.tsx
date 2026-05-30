"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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

const LAGOS_LOCATIONS = [
  "Lekki",
  "Victoria Island",
  "Ikoyi",
  "Ajah",
  "Magodo",
  "Gbagada",
  "Yaba",
  "Surulere",
  "Ikeja",
  "Maryland",
  "Oniru",
  "Banana Island",
  "Chevron",
  "Sangotedo",
];

const SKILL_LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "All levels"];

// Common rate tiers in Lagos tennis market (NGN per hour)
const RATE_OPTIONS = [5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

function formatRate(rate: number) {
  return rate >= 1000 ? `₦${(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)}k` : `₦${rate}`;
}

function toggle(value: string, list: string[], setList: (v: string[]) => void) {
  setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
}

export default function CoachSetupStep3Page() {
  const router = useRouter();
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [customRate, setCustomRate] = useState("");
  const [primaryLocation, setPrimaryLocation] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = hourlyRate !== null && hourlyRate >= 1000 && Boolean(primaryLocation) && skillLevels.length > 0;

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

    // Always include primary location in service areas
    const allAreas = serviceAreas.includes(primaryLocation)
      ? serviceAreas
      : [primaryLocation, ...serviceAreas];

    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .update({
        hourly_rate_ngn: hourlyRate,
        primary_location: primaryLocation,
        service_areas: allAreas,
        skill_levels: skillLevels,
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

    track("Coach Onboarding Step Completed", { step: 3 });
    router.push("/auth/setup/coach/4");
  };

  return (
    <OnboardingShell step="3 of 4">
      <form onSubmit={next} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Rate, location
            <br />&amp; who you coach
          </OnboardingTitle>
          <OnboardingCopy>
            Set your hourly rate, where you coach, and which player levels you take. You can update
            these anytime from your dashboard.
          </OnboardingCopy>
        </section>

        <div className="mt-8 space-y-6">
          {/* Hourly rate */}
          <div className="group">
            <OnboardingFieldLabel required>Hourly rate</OnboardingFieldLabel>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {RATE_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setHourlyRate(rate);
                    setCustomRate("");
                  }}
                  className={`min-h-14 rounded-[16px] border px-3 py-3 text-[14px] font-black leading-tight transition-all active:scale-[0.97] ${
                    hourlyRate === rate
                      ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)] shadow-[0_4px_16px_rgba(196,98,45,0.08)] border-[var(--lobb-clay)]/50"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {formatRate(rate)}
                </button>
              ))}
            </div>
            <label className="mt-4 block group/custom">
              <OnboardingFieldLabel>Custom hourly rate</OnboardingFieldLabel>
              <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
                <span className="relative z-10 mr-2 font-black text-[var(--lobb-text-secondary)]/50">₦</span>
                <input
                  inputMode="numeric"
                  value={customRate}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setCustomRate(digits);
                    setHourlyRate(digits ? Number(digits) : null);
                  }}
                  placeholder="12000"
                  className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
                />
              </div>
              {hourlyRate !== null && hourlyRate < 1000 && (
                <p className="mt-2 text-[12px] font-bold text-[var(--lobb-error)]">Minimum rate is ₦1,000.</p>
              )}
            </label>
          </div>

          {/* Primary location */}
          <div className="group">
            <OnboardingFieldLabel required>Primary location</OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-4 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <select
                value={primaryLocation}
                onChange={(event) => setPrimaryLocation(event.target.value)}
                className="relative z-10 h-full w-full appearance-none border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none focus:ring-0 [&>option]:bg-[var(--lobb-surface)] [&>option]:text-[var(--lobb-text-primary)]"
              >
                <option value="" className="text-[var(--lobb-text-tertiary)] bg-[var(--lobb-surface)]">Choose primary area</option>
                {LAGOS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} className="bg-[var(--lobb-surface)] text-[var(--lobb-text-primary)]">
                    {loc}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-[var(--lobb-text-secondary)]/50">
                <svg className="size-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>

          {/* Other service areas */}
          <div className="group">
            <OnboardingFieldLabel hint="optional">Other areas you cover</OnboardingFieldLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {LAGOS_LOCATIONS.filter((l) => l !== primaryLocation).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggle(loc, serviceAreas, setServiceAreas)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full border px-[18px] py-2.5 text-center text-[12px] font-black leading-tight transition-all active:scale-[0.97] ${
                    serviceAreas.includes(loc)
                      ? "bg-[var(--lobb-clay)] text-white shadow-[0_4px_16px_rgba(196,98,45,0.12)] border-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Skill levels */}
          <div className="group">
            <OnboardingFieldLabel required>Player levels you coach</OnboardingFieldLabel>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SKILL_LEVEL_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggle(level, skillLevels, setSkillLevels)}
                  className={`min-h-14 rounded-[16px] border px-4 py-3 text-[14px] font-black leading-tight transition-all active:scale-[0.97] ${
                    skillLevels.includes(level)
                      ? "bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)] shadow-[0_4px_16px_rgba(196,98,45,0.08)] border-[var(--lobb-clay)]/50"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pb-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-red-400">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue} loading={saving}>
            {saving ? "Saving" : <span className="inline-flex items-center gap-2">Next <ArrowRight className="size-4" /></span>}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
