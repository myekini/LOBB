"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, User } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/components/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";

export default function CoachSetupStepOnePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = Boolean(fullName.trim() && headline.trim() && photoUrl);

  const next = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !photoFile) {
      setSaving(false);
      setError("Please verify your phone number again.");
      return;
    }

    try {
      const uploadedPhotoUrl = await uploadProfilePhoto(supabase, user.id, photoFile, "coach-avatar");

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: "coach",
          full_name: fullName.trim(),
          phone_number: user.phone || null,
          avatar_url: uploadedPhotoUrl,
        });

      if (profileError) {
        throw profileError;
      }

      const { error: coachError } = await supabase.from("coaches").upsert({
        id: user.id,
        full_name: fullName.trim(),
        headline: headline.trim(),
        bio: "Profile setup started in onboarding. Complete the full coach profile from the coach dashboard before going live.",
        hourly_rate_ngn: 1000,
        experience_years: 0,
        primary_location: "Lagos",
        service_areas: [],
        skill_levels: [],
        certifications: [],
        profile_photo_url: uploadedPhotoUrl,
        status: "pending_review",
      });

      if (coachError) {
        throw coachError;
      }

      router.push("/auth/setup/coach/2");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your coach profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="1 of 4">
      <form onSubmit={next} className="flex flex-1 flex-col pt-3">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Let&apos;s set up
            <br />
            your profile
          </OnboardingTitle>
          <OnboardingCopy>You&apos;ll complete your availability, rate, and verification before going live.</OnboardingCopy>
        </section>

        <div className="mt-8 rounded-[28px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-6 shadow-[0_12px_40px_rgba(58,43,20,0.05)]">
          <p className="mb-5 text-center text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
            Public coach photo
          </p>
          <label className="group relative cursor-pointer">
            <span className="mx-auto flex size-32 flex-col items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] transition group-hover:border-[var(--lobb-black)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <>
                  <User className="mb-1 size-9" />
                  <span className="px-3 text-center text-xs font-semibold leading-4">Upload Photo</span>
                </>
              )}
            </span>
            <span className="absolute bottom-0 right-[calc(50%-64px)] flex size-10 translate-x-2 items-center justify-center rounded-full border-4 border-[var(--lobb-surface)] bg-[var(--lobb-black)] text-white">
              <Plus className="size-5" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoUrl(URL.createObjectURL(file));
                }
              }}
            />
          </label>
          {!photoUrl && <p className="mt-4 text-center text-xs font-bold text-[#ba1a1a]">Profile photo required</p>}
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Full name <span className="text-[#ba1a1a]">*</span>
            </span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[var(--lobb-black)]">
              Headline <span className="text-[#ba1a1a]">*</span>
            </span>
            <input
              value={headline}
              maxLength={150}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="ITF Certified · 8 Years · Lekki"
              className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
            <span className="mt-1 block text-right text-xs font-bold text-[var(--lobb-muted)]">{headline.length}/150</span>
          </label>
        </div>

        <div className="mt-auto pb-8">
          {error && <p className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue}>
            <span className="inline-flex items-center gap-2">
              {saving ? "Saving..." : "Next"} <ArrowRight className="size-4" />
            </span>
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
