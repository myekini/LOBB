"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap, Trophy } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { getPendingAuth } from "@/lib/auth-flow";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

type UserRole = "player" | "coach";

type RoleOption = {
  role: UserRole;
  Icon: typeof Trophy;
  title: string;
  body: string;
  meta: string;
};

const options: RoleOption[] = [
  {
    role: "player",
    Icon: Trophy,
    title: "I want to book coaching",
    body: "Find and book verified Lagos tennis coaches.",
    meta: "Player experience",
  },
  {
    role: "coach",
    Icon: GraduationCap,
    title: "I am a coach",
    body: "List your availability and get booked on LOBB.",
    meta: "Coach business tools",
  },
];

export default function RolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pending = getPendingAuth();
    if (pending?.role === "coach" || pending?.role === "player") {
      setSelected(pending.role);
    }
  }, []);

  const continueFlow = async () => {
    if (!selected) {
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
      router.push("/auth/login");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, role: selected, phone_number: user.phone || null })
      .eq("id", user.id);

    setSaving(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    track("Role Selected", { role: selected });
    router.replace(selected === "player" ? "/auth/setup/player" : "/auth/setup/coach/1");
  };

  return (
    <OnboardingShell showBack={false}>
      <section className="flex flex-1 flex-col pt-4">
        <div className="text-center">
          <OnboardingKicker>Choose your path</OnboardingKicker>
          <OnboardingTitle>
            Who is using
            <br />
            LOBB today?
          </OnboardingTitle>
          <OnboardingCopy>
            Select your account type to continue. You can set up the other path later.
          </OnboardingCopy>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center flex-1">
          <div className="grid grid-cols-2 gap-5 sm:gap-8 max-w-sm w-full justify-center px-2">
            {options.map((option) => {
              const isSelected = selected === option.role;
              const Icon = option.Icon;

              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => setSelected(option.role)}
                  className="group flex flex-col items-center focus:outline-none"
                >
                  {/* Netflix Profile Square */}
                  <div
                    className={`relative flex aspect-square w-full max-w-[140px] items-center justify-center rounded-[16px] border-[3px] transition-all duration-300 active:scale-95 ${
                      isSelected
                        ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)]/[0.08] shadow-[0_16px_36px_rgba(196,98,45,0.12)] scale-105"
                        : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] group-hover:border-[var(--lobb-clay)]/40 group-hover:scale-102 group-hover:shadow-[0_8px_24px_rgba(196,98,45,0.04)]"
                    }`}
                  >
                    <Icon
                      className={`size-12 transition-transform duration-500 ${
                        isSelected
                          ? "text-[var(--lobb-clay)] scale-110 rotate-[4deg]"
                          : "text-[var(--lobb-text-secondary)] group-hover:text-[var(--lobb-text-primary)] group-hover:rotate-[-4deg]"
                      }`}
                    />
                    
                    {/* Checkmark overlay */}
                    {isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-[var(--lobb-clay)] text-white shadow-lg animate-in zoom-in duration-300">
                        <Check className="size-4 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Profile Name */}
                  <span
                    className={`mt-4 text-[13px] font-black uppercase tracking-[0.16em] transition-colors duration-300 ${
                      isSelected ? "text-[var(--lobb-clay)]" : "text-[var(--lobb-text-secondary)] group-hover:text-[var(--lobb-text-primary)]"
                    }`}
                  >
                    {option.role === "player" ? "Player" : "Coach"}
                  </span>
                  
                  {/* Profile Description */}
                  <span className="mt-1.5 text-center text-[11px] font-medium leading-relaxed text-[var(--lobb-text-tertiary)] max-w-[125px]">
                    {option.body}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pb-8 pt-12">
          {error && <p className="mb-4 text-center text-sm font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton disabled={!selected} loading={saving} onClick={continueFlow}>
            {saving ? "Saving" : "Continue"}
          </OnboardingButton>
        </div>
      </section>
    </OnboardingShell>
  );
}
