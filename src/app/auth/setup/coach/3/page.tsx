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

        <div className="mt-8 space-y-8">
          {/* Hourly rate */}
          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Hourly rate <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {RATE_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setHourlyRate(rate);
                    setCustomRate("");
                  }}
                  className={`h-12 rounded-[14px] border text-[13px] font-bold transition-all active:scale-[0.98] ${
                    hourlyRate === rate
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-white/[0.08]"
                      : "border-transparent bg-white/[0.02] text-white/40 hover:text-white/80 hover:bg-white/[0.04] backdrop-blur-sm"
                  }`}
                >
                  {formatRate(rate)}
                </button>
              ))}
            </div>
            <label className="mt-4 block group/custom">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Custom hourly rate</span>
              <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-5 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
                <span className="relative z-10 mr-2 font-black text-white/40">₦</span>
                <input
                  inputMode="numeric"
                  value={customRate}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setCustomRate(digits);
                    setHourlyRate(digits ? Number(digits) : null);
                  }}
                  placeholder="12000"
                  className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-white outline-none placeholder:text-white/20 focus:ring-0"
                />
              </div>
              {hourlyRate !== null && hourlyRate < 1000 && (
                <p className="mt-2 text-[12px] font-bold text-red-400">Minimum rate is ₦1,000.</p>
              )}
            </label>
          </div>

          {/* Primary location */}
          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Primary location <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-4 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
              <select
                value={primaryLocation}
                onChange={(event) => setPrimaryLocation(event.target.value)}
                className="relative z-10 h-full w-full appearance-none border-0 bg-transparent text-[15px] font-bold tracking-wide text-white outline-none focus:ring-0 [&>option]:bg-[#050505] [&>option]:text-white"
              >
                <option value="" className="text-white/40">Choose primary area</option>
                {LAGOS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-white/40">
                <svg className="size-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>

          {/* Other service areas */}
          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Other areas you cover{" "}
              <span className="text-white/30 normal-case font-semibold tracking-normal">(optional)</span>
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {LAGOS_LOCATIONS.filter((l) => l !== primaryLocation).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => toggle(loc, serviceAreas, setServiceAreas)}
                  className={`rounded-full border px-4 py-2 text-[12px] font-bold transition-all active:scale-[0.98] ${
                    serviceAreas.includes(loc)
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-white/[0.08]"
                      : "border-transparent bg-white/[0.02] text-white/40 hover:text-white/80 hover:bg-white/[0.04] backdrop-blur-sm"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Skill levels */}
          <div className="group">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
              Player levels you coach <span className="text-red-400 normal-case font-bold">*</span>
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SKILL_LEVEL_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggle(level, skillLevels, setSkillLevels)}
                  className={`h-12 rounded-[14px] border text-[13px] font-bold transition-all active:scale-[0.98] ${
                    skillLevels.includes(level)
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border-white/[0.08]"
                      : "border-transparent bg-white/[0.02] text-white/40 hover:text-white/80 hover:bg-white/[0.04] backdrop-blur-sm"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
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
