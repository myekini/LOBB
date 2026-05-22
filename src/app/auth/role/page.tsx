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

    router.push(selected === "player" ? "/auth/setup/player" : "/auth/setup/coach/1");
  };

  return (
    <OnboardingShell showBack={false}>
      <section className="flex flex-1 flex-col pt-3">
        <div>
          <OnboardingKicker>Choose your path</OnboardingKicker>
          <OnboardingTitle>
            How will you
            <br />
            use LOBB?
          </OnboardingTitle>
          <OnboardingCopy>Choose one role for this account. You can create the other path later.</OnboardingCopy>
        </div>

        <div className="mt-9 space-y-4">
          {options.map((option) => {
            const isSelected = selected === option.role;
            const Icon = option.Icon;

            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelected(option.role)}
                className={`relative flex min-h-[152px] w-full flex-col justify-center rounded-[24px] border p-5 text-left shadow-[0_12px_40px_rgba(58,43,20,0.02)] transition-all duration-300 active:scale-[0.98] ${
                  isSelected
                    ? "border-[var(--lobb-clay)] bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.04] shadow-[0_16px_36px_rgba(196,98,45,0.06)]"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] hover:border-[var(--lobb-clay)]/40 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? "bg-[var(--lobb-clay)] text-white shadow-[0_8px_20px_rgba(196,98,45,0.25)]"
                        : "bg-[var(--lobb-surface-2)] text-[var(--lobb-black)]"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="size-6 animate-pulse" style={{ animationDuration: isSelected ? '3s' : '0s' }} />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
                      {option.meta}
                    </span>
                    <h2 className="mt-1 text-lg font-black leading-6 tracking-normal text-[var(--lobb-black)]">
                      {option.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--lobb-muted)]">{option.body}</p>
                  </div>
                </div>
                <span
                  className={`absolute right-5 top-5 flex size-6 items-center justify-center rounded-full border transition-all duration-300 ${
                    isSelected
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white scale-110 shadow-[0_4px_10px_rgba(196,98,45,0.2)]"
                      : "border-[var(--lobb-border)] bg-transparent scale-100"
                  }`}
                >
                  {isSelected && <Check className="size-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pb-8">
          {error && <p className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
          <OnboardingButton disabled={!selected} onClick={continueFlow}>
            {saving ? "Saving..." : "Continue"}
          </OnboardingButton>
        </div>
      </section>
    </OnboardingShell>
  );
}
