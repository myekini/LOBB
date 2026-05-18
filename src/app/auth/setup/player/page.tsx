"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/components/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";

export default function PlayerSetupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const finish = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!fullName.trim()) {
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
        uploadedPhotoUrl = await uploadProfilePhoto(supabase, user.id, photoFile, "player-avatar");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          role: "player",
          full_name: fullName.trim(),
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

        <div className="mt-10 flex flex-col items-center rounded-[28px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-6 shadow-[0_12px_40px_rgba(58,43,20,0.05)]">
          <label className="group flex cursor-pointer flex-col items-center">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] transition group-hover:border-[var(--lobb-black)]">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <Camera className="size-8" />
              )}
            </span>
            <span className="mt-4 text-sm font-black text-[var(--lobb-black)]">Add a photo</span>
            <span className="mt-1 text-xs font-semibold text-[var(--lobb-muted)]">Optional, but useful for bookings</span>
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
        </div>

        <label className="mt-8 block">
          <span className="text-sm font-bold text-[var(--lobb-black)]">Full name</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
            className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold text-[var(--lobb-black)] outline-none transition placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
          />
        </label>

        <div className="mt-auto space-y-3 pb-8">
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton type="submit" disabled={!fullName.trim()}>
            {saving ? "Saving..." : "Finish Setup"}
          </OnboardingButton>
          <button
            type="button"
            className="h-12 w-full rounded-full text-sm font-bold text-[var(--lobb-muted)] transition hover:bg-white/50"
            onClick={() => {
              setPhotoUrl("");
              setPhotoFile(null);
            }}
          >
            Skip for now
          </button>
        </div>
      </form>
    </OnboardingShell>
  );
}
