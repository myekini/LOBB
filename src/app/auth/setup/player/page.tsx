"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";

export default function PlayerSetupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!fullName.trim() || !normalizedEmail) {
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Please verify your phone number again.");
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
          email: normalizedEmail,
          phone_number: user.phone || null,
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
      router.push("/");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not finish setup.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="1 of 1">
      <form onSubmit={finish} className="flex flex-1 flex-col pt-3">
        <section>
          <OnboardingKicker>Player profile</OnboardingKicker>
          <OnboardingTitle>Almost done</OnboardingTitle>
          <OnboardingCopy>Add your name so coaches know who they&apos;re preparing for.</OnboardingCopy>
        </section>

        <label className="mt-10 block">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Fola Adeola"
            className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition-all duration-200 placeholder:text-[#9b958a] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
          />
        </label>

        <label className="mt-5 block">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition-all duration-200 placeholder:text-[#9b958a] focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10"
          />
        </label>

        <div className="mt-6 flex flex-col items-center rounded-3xl border border-[var(--lobb-border)] bg-gradient-to-b from-white to-[var(--lobb-surface)] p-6 shadow-[0_16px_40px_rgba(58,43,20,0.02)]">
          <label className="group flex cursor-pointer flex-col items-center">
            <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] transition-all duration-300 group-hover:border-[var(--lobb-clay)] group-hover:shadow-[0_0_15px_rgba(196,98,45,0.15)] group-hover:scale-105">
              {photoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Camera className="size-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Camera className="size-7 text-[var(--lobb-muted)] transition-colors duration-300 group-hover:text-[var(--lobb-clay)]" />
                </div>
              )}
            </div>
            <span className="mt-4 text-sm font-black text-[var(--lobb-black)] transition-colors duration-300 group-hover:text-[var(--lobb-clay)]">
              {photoUrl ? "Change photo" : "Add your photo"}
            </span>
            <span className="mt-1 text-[11px] font-semibold text-[var(--lobb-muted)] text-center max-w-[200px] leading-relaxed">
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
              className="mt-4 h-9 rounded-full px-4 text-xs font-bold text-[var(--lobb-clay)] transition hover:bg-[var(--lobb-clay)]/5 border border-[var(--lobb-clay)]/10"
              onClick={() => {
                setPhotoUrl("");
                setPhotoFile(null);
              }}
            >
              Remove photo
            </button>
          )}
        </div>

        <div className="mt-auto space-y-3 pb-8">
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!fullName.trim() || !email.trim()} loading={saving}>
            {saving ? "Saving" : "Finish Setup"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
