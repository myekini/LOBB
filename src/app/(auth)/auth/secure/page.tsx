"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormAlert } from "@/components/ui/form-alert";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { LoginSkeleton } from "@/features/auth/auth-email-form";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { showLobbToast } from "@/providers/lobb-global-state";

const MIN_LENGTH = 8;

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/home";
  return next;
}

function SecurePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => safeNext(searchParams.get("next")), [searchParams]);
  const isReset = searchParams.get("reset") === "1";

  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        showLobbToast({ type: "error", message: "Your verification session expired. Please sign in again." });
        router.replace("/auth/login");
        return;
      }
      if (!isReset) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_password")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.has_password) {
          router.replace(next);
          return;
        }
      }
      setChecking(false);
    }).catch((error) => {
      console.error("[auth-secure] getUser failed:", error instanceof Error ? error.message : error);
      showLobbToast({ type: "error", message: "We could not verify your session. Please sign in again." });
      router.replace("/auth/login");
    });
  }, [router, next, isReset]);

  const proceed = () => {
    router.replace(next);
    router.refresh();
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setError("");
    setSaving(true);

    const response = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);

    if (!response.ok) {
      setError(result?.error || "Could not set your password. Try again.");
      return;
    }

    track("Password Set");
    showLobbToast({ type: "success", message: isReset ? "Password updated." : "Password set — you're all set." });
    proceed();
  };

  if (checking) return <LoginSkeleton />;

  return (
    <OnboardingShell showBack={false}>
      <section className="flex flex-1 flex-col pt-4">
        <OnboardingKicker>{isReset ? "Reset password" : "Secure your account"}</OnboardingKicker>

        <form onSubmit={savePassword} className="flex flex-1 flex-col">
            <OnboardingTitle>{isReset ? "Choose a new password" : "Set a password"}</OnboardingTitle>
            <OnboardingCopy>
              {isReset
                ? "You're verified by email. Pick a new password — you'll use it to sign in from now on."
                : "Your email is verified. Create a password for future sign-ins, then continue with your profile."}
            </OnboardingCopy>

            <label className="mt-9 block">
              <OnboardingFieldLabel required>Password</OnboardingFieldLabel>
              <PasswordInput
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-2 h-16 w-full rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-5 text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none transition-all placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)]/50 focus:bg-[var(--lobb-bg-elevated)]"
              />
            </label>

            <label className="mt-5 block">
              <OnboardingFieldLabel required>Confirm password</OnboardingFieldLabel>
              <PasswordInput
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className="mt-2 h-16 w-full rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-5 text-[15px] font-bold tracking-wide text-[var(--lobb-text-primary)] outline-none transition-all placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)]/50 focus:bg-[var(--lobb-bg-elevated)]"
              />
            </label>

            <div className="mt-auto space-y-3 pb-8 pt-10">
              {error && <FormAlert className="mb-4">{error}</FormAlert>}
              <OnboardingButton
                type="submit"
                disabled={password.length < MIN_LENGTH || confirm.length === 0}
                loading={saving}
              >
                {saving ? "Saving" : isReset ? "Save new password" : "Set password & continue"}
              </OnboardingButton>
            </div>
          </form>
      </section>
    </OnboardingShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <SecurePage />
    </Suspense>
  );
}
