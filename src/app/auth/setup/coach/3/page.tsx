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
      <form onSubmit={next} className="flex flex-1 flex-col pt-3">
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

        <div className="mt-8 space-y-7">
          {/* Hourly rate */}
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Hourly rate <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {RATE_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setHourlyRate(rate);
                    setCustomRate("");
                  }}
                  className={`h-12 rounded-2xl border text-sm font-black transition ${
                    hourlyRate === rate
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {formatRate(rate)}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-[var(--lobb-muted)]">Custom hourly rate</span>
              <div className="mt-1 flex h-14 items-center rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 focus-within:border-[var(--lobb-black)] focus-within:ring-2 focus-within:ring-black/5">
                <span className="mr-2 font-black text-[var(--lobb-muted)]">₦</span>
                <input
                  inputMode="numeric"
                  value={customRate}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setCustomRate(digits);
                    setHourlyRate(digits ? Number(digits) : null);
                  }}
                  placeholder="12000"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold text-[var(--lobb-black)] outline-none placeholder:text-[#9b958a] focus:ring-0"
                />
              </div>
              {hourlyRate !== null && hourlyRate < 1000 && (
                <p className="mt-1 text-xs font-bold text-[#ba1a1a]">Minimum rate is ₦1,000.</p>
              )}
            </label>
          </div>

          {/* Primary location */}
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Primary location <span className="text-[#ba1a1a]">*</span>
            </span>
            <select
              value={primaryLocation}
              onChange={(event) => setPrimaryLocation(event.target.value)}
              className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-black text-[var(--lobb-black)] outline-none transition focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            >
              <option value="">Choose primary area</option>
              {LAGOS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Other service areas */}
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Other areas you cover{" "}
              <span className="text-xs font-semibold text-[var(--lobb-muted)]">(optional)</span>
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {LAGOS_LOCATIONS.filter((l) => l !== primaryLocation).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggle(loc, serviceAreas, setServiceAreas)}
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    serviceAreas.includes(loc)
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Skill levels */}
          <div>
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Player levels you coach <span className="text-[#ba1a1a]">*</span>
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SKILL_LEVEL_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggle(level, skillLevels, setSkillLevels)}
                  className={`h-12 rounded-2xl border text-sm font-black transition ${
                    skillLevels.includes(level)
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto pb-8">
          {error && <p className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue} loading={saving}>
            {saving ? "Saving" : <span className="inline-flex items-center gap-2">Next <ArrowRight className="size-4" /></span>}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
