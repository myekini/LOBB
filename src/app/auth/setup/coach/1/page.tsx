"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { ArrowRight, Plus, User } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";

export default function CoachSetupStepOnePage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const canContinue = Boolean(fullName.trim() && headline.trim() && photoUrl && photoFile);

  useEffect(() => {
    try {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user?.email) setAuthEmail(data.user.email);
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in is temporarily unavailable.");
    }
  }, []);

  const next = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (!canContinue) {
      setError("Add your name, email, headline, and profile photo to continue.");
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
      setError("Session expired. Please sign in again.");
      return;
    }

    const normalizedEmail = (user.email || authEmail).trim().toLowerCase();

    try {
      const uploadedPhotoUrl = await uploadProfilePhoto(supabase, user.id, photoFile, "coach-avatar");

      const response = await fetch("/api/coaches/onboarding/step-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: normalizedEmail,
          headline,
          profile_photo_url: uploadedPhotoUrl,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error || "Could not save your coach profile.");
      }

      track("Coach Onboarding Step Completed", { step: 1 });
      router.push("/auth/setup/coach/2");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save your coach profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="1 of 6">
      <form onSubmit={next} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Let&apos;s set up
            <br />
            your profile
          </OnboardingTitle>
          <OnboardingCopy>You&apos;ll complete your availability, rate, and verification before going live.</OnboardingCopy>
        </section>

        <div className="mt-8 flex flex-col items-center rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-8 relative overflow-hidden">
          <p className="mb-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lobb-clay)]">
            Public coach photo
          </p>
          <label className="group relative z-10 cursor-pointer flex flex-col items-center">
            <div className="relative flex size-[120px] items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-text-secondary)] transition-all duration-500 group-hover:border-[var(--lobb-clay)]/50 group-hover:shadow-[0_0_32px_rgba(196,98,45,0.12)] group-hover:scale-105 group-hover:bg-[var(--lobb-surface-2)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <>
                  <User className="mb-2 size-10 text-[var(--lobb-text-secondary)]/50 transition-colors duration-500 group-hover:text-[var(--lobb-clay)]" />
                  <span className="px-4 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--lobb-text-secondary)]/70 group-hover:text-[var(--lobb-text-primary)]">Upload</span>
                </>
              )}
            </div>
            <span className="absolute bottom-2 right-0 translate-x-1 translate-y-1 flex size-10 items-center justify-center rounded-full bg-[var(--lobb-clay)] border-[3px] border-[var(--lobb-surface-2)] text-white shadow-lg transition-transform group-hover:scale-110">
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
          {submitted && !photoUrl && <p className="mt-5 text-center text-[12px] font-bold text-[var(--lobb-error)]">Profile photo required</p>}
        </div>

        <div className="mt-8 space-y-6">
          <label className="block group">
            <OnboardingFieldLabel required>Full name</OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
          </label>

          <label className="block">
            <OnboardingFieldLabel>Email</OnboardingFieldLabel>
            <div className="mt-2 flex h-16 items-center rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]/50 px-5 text-[15px] font-bold tracking-wide text-[var(--lobb-text-secondary)]/70 backdrop-blur-sm">
              {authEmail || "Loading…"}
            </div>
          </label>

          <label className="block group">
            <OnboardingFieldLabel required hint={`${headline.length}/150`}>Headline</OnboardingFieldLabel>
            <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                value={headline}
                maxLength={150}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="ITF Certified · 8 Years · Lekki"
                className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
          </label>
        </div>

        <div className="mt-auto pb-8 pt-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton type="submit" disabled={saving} loading={saving}>
            <span className="inline-flex items-center gap-2">
              {saving ? "Saving" : "Next"} {!saving && <ArrowRight className="size-4" />}
            </span>
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
