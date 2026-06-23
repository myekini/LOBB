"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
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
import { uploadProfilePhoto } from "@/lib/supabase/uploads";

export default function PlayerSetupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setAuthEmail(data.user.email);
    });
  }, []);

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Session expired. Please sign in again.");
      return;
    }

    let uploadedPhotoUrl = "";

    try {
      if (photoFile) {
        uploadedPhotoUrl = await uploadProfilePhoto(supabase, user.id, photoFile, "player-avatar", "user-media");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: "player",
          full_name: fullName.trim(),
          email: user.email || authEmail || null,
          phone_number: phone.trim() || user.phone || null,
          avatar_url: uploadedPhotoUrl || null,
        });

      if (profileError) {
        throw profileError;
      }

      const { error: playerError } = await supabase
        .from("players")
        .upsert({ id: user.id, full_name: fullName.trim() });

      if (playerError) {
        throw playerError;
      }

      track("Player Profile Created");
      router.replace("/home");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not finish setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="1 of 1">
      <form onSubmit={finish} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Player profile</OnboardingKicker>
          <OnboardingTitle>Almost done</OnboardingTitle>
          <OnboardingCopy>Add your name so coaches know who they&apos;re preparing for.</OnboardingCopy>
        </section>

        <label className="mt-10 block group">
          <OnboardingFieldLabel required>Full name</OnboardingFieldLabel>
          <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g. Fola Adeola"
              className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
            />
          </div>
        </label>

        {authEmail && (
          <label className="mt-6 block">
            <OnboardingFieldLabel>Email</OnboardingFieldLabel>
            <div className="mt-2 flex h-16 items-center rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]/50 px-5 text-[15px] font-bold tracking-wide text-[var(--lobb-text-secondary)]/70 backdrop-blur-sm">
              {authEmail}
            </div>
          </label>
        )}

        <label className="mt-6 block group">
          <OnboardingFieldLabel hint="optional">Phone number</OnboardingFieldLabel>
          <div className="mt-2 relative flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+234 801 234 5678"
              className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
            />
          </div>
          <p className="mt-3 text-[11px] font-medium text-[var(--lobb-text-secondary)]/70">Coaches can reach you on WhatsApp for session details</p>
        </label>

        <div className="mt-8 flex flex-col items-center rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-8 relative overflow-hidden">
          <label className="group flex cursor-pointer flex-col items-center relative z-10">
            <div className="relative flex size-[104px] items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-text-secondary)] transition-all duration-500 group-hover:border-[var(--lobb-clay)]/50 group-hover:shadow-[0_0_32px_rgba(196,98,45,0.12)] group-hover:scale-105 group-hover:bg-[var(--lobb-surface-2)]">
              {photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--lobb-black)]/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-[2px]">
                    <Camera className="size-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Camera className="size-8 text-[var(--lobb-text-secondary)]/50 transition-colors duration-500 group-hover:text-[var(--lobb-clay)]" />
                </div>
              )}
            </div>
            <span className="mt-5 text-[14px] font-black text-[var(--lobb-text-primary)] transition-colors duration-300 group-hover:text-[var(--lobb-clay)]">
              {photoUrl ? "Change photo" : "Add your photo"}
            </span>
            <span className="mt-2 text-[12px] font-medium text-[var(--lobb-text-secondary)]/70 text-center max-w-[220px] leading-relaxed">
              Recommended to help Lagos tennis coaches recognize you
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
          {photoUrl && (
            <button
              type="button"
              className="mt-5 relative z-10 h-9 rounded-full px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--lobb-error)]/80 transition-all hover:text-[var(--lobb-error)] hover:bg-[var(--lobb-error)]/10 border border-transparent hover:border-[var(--lobb-error)]/20"
              onClick={() => {
                setPhotoUrl("");
                setPhotoFile(null);
              }}
            >
              Remove photo
            </button>
          )}
        </div>

        <div className="mt-auto space-y-3 pb-8 pt-10">
          {error && <p className="text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton type="submit" disabled={!fullName.trim()} loading={saving}>
            {saving ? "Saving" : "Finish Setup"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
