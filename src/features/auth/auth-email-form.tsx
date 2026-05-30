"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Trophy } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { setPendingAuth } from "@/lib/auth-flow";
type LoginRole = "player" | "coach" | "admin";
type PublicLoginRole = "player" | "coach";
type AuthMode = "signup" | "login";

const roleOptions: Array<{
  role: PublicLoginRole;
  title: string;
  body: string;
  Icon: typeof Trophy;
}> = [
  {
    role: "player",
    title: "Player",
    body: "Find and book Lagos tennis coaches.",
    Icon: Trophy,
  },
  {
    role: "coach",
    title: "Coach",
    body: "Manage your profile, sessions, and earnings.",
    Icon: GraduationCap,
  },
];


function getIntentRole(searchParams: ReturnType<typeof useSearchParams>): LoginRole | undefined {
  const raw = searchParams.get("role");
  if (raw === "coach") return "coach";
  return undefined;
}

export function AuthEmailForm({
  forcedMode,
  forcedRole,
}: {
  forcedMode?: AuthMode;
  forcedRole?: PublicLoginRole;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || undefined;
  const intentRole = getIntentRole(searchParams);
  const authMode = forcedMode ?? (searchParams.get("mode") === "signup" ? "signup" : "login");
  const [selectedRole, setSelectedRole] = useState<PublicLoginRole>(forcedRole ?? (intentRole === "coach" ? "coach" : "player"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || loading) return;

    setError("");
    setLoading(true);

    const roleToSend: LoginRole | undefined = authMode === "signup" ? selectedRole : undefined;
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), ...(roleToSend ? { role: roleToSend } : {}) }),
    });

    setLoading(false);

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(result?.error || "Could not send code. Try again.");
      return;
    }

    setPendingAuth({
      email: email.trim().toLowerCase(),
      mode: authMode,
      sentAt: Date.now(),
      nextPath,
      ...(roleToSend ? { role: roleToSend } : {}),
    });
    router.push("/auth/verify");
  };

  const selectedOption = roleOptions.find((option) => option.role === selectedRole) ?? roleOptions[0];
  const SelectedIcon = selectedOption.Icon;
  const isDedicatedSignup = Boolean(forcedMode === "signup" && forcedRole);

  const titleLines = authMode === "signup"
    ? selectedRole === "coach" ? ["Coach", "Sign up"] : ["Player", "Sign up"]
    : ["Welcome", "back"];

  const submitLabel = authMode === "signup" ? "Send sign-up code" : "Send login code";

  // Escape hatch: on a dedicated coach signup, offer player path, and vice versa
  const escapeHref = isDedicatedSignup
    ? forcedRole === "coach" ? "/auth/signup/player" : "/auth/signup/coach"
    : null;
  const escapeLabel = isDedicatedSignup
    ? forcedRole === "coach" ? "I'm a player, not a coach →" : "I'm a coach, not a player →"
    : null;

  return (
    <OnboardingShell backHref="/">
      <form onSubmit={submit} className="flex flex-1 flex-col pt-2 pb-8">
        {/* Header */}
        <section>
          <OnboardingKicker>LOBB · {authMode === "signup" ? "Join" : "Access"}</OnboardingKicker>
          <OnboardingTitle>{titleLines[0]}<br />{titleLines[1]}</OnboardingTitle>
          <OnboardingCopy>
            {authMode === "signup"
              ? `Create your ${selectedOption.title.toLowerCase()} profile. We'll send a 6-digit magic code to verify your email.`
              : "Enter your registered email. We'll send a 6-digit magic code for secure, passwordless access."}
          </OnboardingCopy>
        </section>

        {/* Role selector — generic signup only */}
        {authMode === "signup" && !isDedicatedSignup && (
          <section className="mt-5 flex rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1.5" aria-label="Choose account type">
            {roleOptions.map((option) => {
              const Icon = option.Icon;
              const isSelected = selectedRole === option.role;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => setSelectedRole(option.role)}
                  className={`inline-flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full text-[13px] font-bold transition-all active:scale-[0.98] ${
                    isSelected
                      ? "bg-[var(--lobb-surface-2)] text-[var(--lobb-black)] border border-[var(--lobb-border)]"
                      : "text-[var(--lobb-muted)] hover:text-[var(--lobb-black)] border border-transparent"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {option.role === "coach" ? "Coach" : "Player"}
                </button>
              );
            })}
          </section>
        )}

        {/* Account type card — dedicated signup only */}
        {authMode === "signup" && isDedicatedSignup && (
          <div className="mt-8 flex items-start gap-4 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-clay)]/10 text-[var(--lobb-clay)]">
              <SelectedIcon className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-black text-[var(--lobb-black)]">{selectedOption.title} account</p>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-[var(--lobb-muted)]">{selectedOption.body}</p>
            </div>
          </div>
        )}

        {/* Email input */}
        <div className="mt-8 flex flex-col gap-2">
          <OnboardingFieldLabel required>Email address</OnboardingFieldLabel>
          <label className="group relative flex h-16 items-center overflow-hidden rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50">
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold text-[var(--lobb-black)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
            />
          </label>
          {error && <p className="text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
        </div>

        {/* CTA */}
        <div className="mt-8">
          <OnboardingButton type="submit" disabled={!isReady} loading={loading}>
            {loading ? "Sending code..." : submitLabel}
          </OnboardingButton>

          {/* Terms — below CTA */}
          <p className="mt-4 px-4 text-center text-[11px] font-semibold leading-relaxed text-[var(--lobb-text-tertiary)]">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-[var(--lobb-clay)]">Terms</Link> &amp;{" "}
            <Link href="/privacy" className="text-[var(--lobb-clay)]">Privacy Policy</Link>
          </p>

          {/* Signup links — login only, below CTA */}
          {authMode === "login" && (
            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--lobb-border)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">New to LOBB?</span>
                <div className="h-px flex-1 bg-[var(--lobb-border)]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/auth/signup/player"
                  className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
                >
                  <Trophy className="size-3.5" />
                  Player signup
                </Link>
                <Link
                  href="/auth/signup/coach"
                  className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
                >
                  <GraduationCap className="size-3.5" />
                  Coach signup
                </Link>
              </div>
            </div>
          )}

          {/* Escape hatch — dedicated signup only */}
          {escapeHref && escapeLabel && (
            <div className="mt-5 text-center">
              <Link
                href={escapeHref}
                className="text-[12px] font-semibold text-[var(--lobb-text-tertiary)] hover:text-[var(--lobb-clay)] transition-colors"
              >
                {escapeLabel}
              </Link>
            </div>
          )}

          {/* Already have an account — signup only */}
          {authMode === "signup" && (
            <div className="mt-4 text-center">
              <Link
                href="/auth/login"
                className="text-[12px] font-semibold text-[var(--lobb-text-tertiary)] hover:text-[var(--lobb-black)] transition-colors"
              >
                Already have an account? Log in
              </Link>
            </div>
          )}
        </div>
      </form>
    </OnboardingShell>
  );
}

export function LoginSkeleton() {
  return (
    <OnboardingShell>
      <section className="flex flex-1 flex-col pt-2 pb-8">
        <div className="h-6 w-32 rounded-full bg-[var(--lobb-border)] animate-pulse" />
        <div className="mt-6 h-20 w-56 rounded-[18px] bg-[var(--lobb-border)] animate-pulse" />
        <div className="mt-5 h-16 w-full rounded-[18px] bg-[var(--lobb-border)] animate-pulse" />
        <div className="mt-8 h-16 rounded-2xl bg-[var(--lobb-border)] animate-pulse" />
      </section>
    </OnboardingShell>
  );
}
