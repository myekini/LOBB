"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { FormAlert } from "@/components/ui/form-alert";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Trophy } from "lucide-react";
import { OnboardingShell } from "@/features/auth/onboarding-shell";
import { ConsentCheckbox, ConsentLink } from "@/components/ui/consent-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { setPendingAuth } from "@/lib/auth-flow";
import { TurnstileWidget, turnstileConfigured } from "@/features/auth/turnstile-widget";

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
    body: "Find and book verified Lagos tennis coaches.",
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
  const [selectedRole, setSelectedRole] = useState<PublicLoginRole>(
    forcedRole ?? (intentRole === "coach" ? "coach" : "player")
  );
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [acceptedCoreTerms, setAcceptedCoreTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const needsTurnstile = authMode === "signup" && turnstileConfigured();
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasAcceptedSignupLegal = authMode !== "signup" || acceptedCoreTerms;
  const isReady =
    hasValidEmail && hasAcceptedSignupLegal && (!needsTurnstile || turnstileToken !== null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || loading) return;

    setError("");
    setLoading(true);

    const roleToSend: LoginRole | undefined = authMode === "signup" ? selectedRole : undefined;
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        ...(roleToSend ? { role: roleToSend } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
      }),
    });

    setLoading(false);

    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(
        response.status === 404 && authMode === "login"
          ? "no_account"
          : result?.error || "Could not send code. Try again."
      );
      return;
    }

    setPendingAuth({
      email: email.trim().toLowerCase(),
      mode: authMode,
      sentAt: Date.now(),
      nextPath,
      ...(authMode === "signup"
        ? { acceptedLegalDocuments: ["terms_of_service", "privacy_policy"] }
        : {}),
      ...(roleToSend ? { role: roleToSend } : {}),
    });
    router.push("/auth/verify");
  };

  const selectedOption = roleOptions.find((o) => o.role === selectedRole) ?? roleOptions[0];
  const SelectedIcon = selectedOption.Icon;
  const isDedicatedSignup = Boolean(forcedMode === "signup" && forcedRole);

  const headingRole = authMode === "signup"
    ? selectedRole === "coach" ? "Coach" : "Player"
    : null;

  const escapeHref = isDedicatedSignup ? "/auth/signup" : null;
  const escapeLabel = isDedicatedSignup ? "Change account type" : null;

  return (
    <OnboardingShell backHref={authMode === "signup" ? "/auth/signup" : "/"}>
      <form onSubmit={submit} className="flex flex-1 flex-col pb-10">

        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="text-[34px] font-semibold leading-[1.04] tracking-tight text-[var(--lobb-bg-inverse)] sm:text-[40px]">
            {authMode === "signup" ? `Create your ${headingRole?.toLowerCase()} account` : "Sign in to LOBB"}
          </h1>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--lobb-text-secondary)]">
          {authMode === "signup"
            ? "Enter your email. We'll send a six-digit verification code."
            : "Enter your email to receive a verification code."}
        </p>

        {/* ── Underline role tabs — generic signup only ─────────────────── */}
        {authMode === "signup" && !isDedicatedSignup && (
          <div className="mt-5 flex border-b border-[var(--lobb-border-subtle)]" aria-label="Choose account type">
            {roleOptions.map((option) => {
              const isSelected = selectedRole === option.role;
              return (
                <LobbButton variant="unstyled"
                  key={option.role}
                  type="button"
                  onClick={() => setSelectedRole(option.role)}
                  className={`-mb-px mr-5 pb-3 text-[12px] font-bold uppercase tracking-[0.13em] border-b-2 transition-all duration-200 ${
                    isSelected
                      ? "border-[var(--lobb-clay)] text-[var(--lobb-clay)]"
                      : "border-transparent text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-bg-inverse)]"
                  }`}
                >
                  {option.title}
                </LobbButton>
              );
            })}
          </div>
        )}

        {/* ── Info pill — dedicated signup ─────────────────────────────── */}
        {authMode === "signup" && isDedicatedSignup && (
          <div className="mt-5 flex items-center gap-2.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)]/15 bg-[var(--lobb-clay)]/6 px-3.5 py-2.5">
            <SelectedIcon className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
            <span className="text-[12px] font-medium leading-snug text-[var(--lobb-text-secondary)]">
              {selectedOption.body}
            </span>
          </div>
        )}

        {/* ── Email input ───────────────────────────────────────────────── */}
        <Field label="Email address" className="mt-7">
            <Input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          {error === "no_account" ? (
            <FormAlert className="mt-1" variant="info" title="No account with this email yet">
              Want to join LOBB?{" "}
              <Link href={`/auth/signup/player?email=${encodeURIComponent(email.trim().toLowerCase())}`} className="font-medium text-[var(--lobb-clay)] underline-offset-2 hover:underline">
                Sign up as a player
              </Link>{" "}
              or{" "}
              <Link href={`/auth/signup/coach?email=${encodeURIComponent(email.trim().toLowerCase())}`} className="font-medium text-[var(--lobb-clay)] underline-offset-2 hover:underline">
                as a coach
              </Link>.
            </FormAlert>
          ) : error ? (
            <FormAlert className="mt-1">{error}</FormAlert>
          ) : null}
        </Field>

        {/* Essential account consent. Booking terms appear during checkout. */}
        {authMode === "signup" && (
          <div className="mt-6 flex flex-col gap-2.5">
            <ConsentCheckbox checked={acceptedCoreTerms} onChange={setAcceptedCoreTerms}>
              I have read and agree to LOBB&apos;s{" "}
              <ConsentLink href="/terms">Terms of Service</ConsentLink> and{" "}
              <ConsentLink href="/privacy">Privacy Policy</ConsentLink>.
            </ConsentCheckbox>
          </div>
        )}

        {/* ── Bot check — signup only ─────────────────────────────────── */}
        {needsTurnstile && (
          <div className="mt-6">
            <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
            {!turnstileToken && <p className="mt-2 text-xs text-[var(--lobb-text-secondary)]">Complete the security check to continue.</p>}
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <div className="mt-7">
          <Button
            type="submit"
            disabled={!isReady || loading}
            size="lg"
            className="w-full uppercase tracking-[0.12em]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-white/75" />
                Sending code…
              </span>
            ) : authMode === "signup" ? (
              "Send verification code"
            ) : (
              "Send verification code"
            )}
          </Button>

          {authMode === "login" && (
            <p className="mt-4 px-4 text-center text-[11px] font-medium leading-relaxed text-[var(--lobb-text-tertiary)]">
              By continuing you agree to our{" "}
              <Link href="/terms" className="text-[var(--lobb-clay)]">Terms</Link> &amp;{" "}
              <Link href="/privacy" className="text-[var(--lobb-clay)]">Privacy Policy</Link>
            </p>
          )}

          {/* New to LOBB — login only */}
          {authMode === "login" && (
            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--lobb-border-subtle)]" />
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
                  New to LOBB?
                </span>
                <div className="h-px flex-1 bg-[var(--lobb-border-subtle)]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/auth/signup/player"
                  className="flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
                >
                  <Trophy className="size-3.5" />
                  Player
                </Link>
                <Link
                  href="/auth/signup/coach"
                  className="flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
                >
                  <GraduationCap className="size-3.5" />
                  Coach
                </Link>
              </div>
            </div>
          )}

          {/* Escape hatch — dedicated signup */}
          {escapeHref && escapeLabel && (
            <div className="mt-5 text-center">
              <Link
                href={escapeHref}
                className="text-[12px] font-medium text-[var(--lobb-text-tertiary)] hover:text-[var(--lobb-clay)] transition-colors"
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
                className="text-[12px] font-medium text-[var(--lobb-text-tertiary)] hover:text-[var(--lobb-bg-inverse)] transition-colors"
              >
                Already have an account? <span className="text-[var(--lobb-bg-inverse)] font-medium">Sign in</span>
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
      <section className="flex flex-1 flex-col pb-8">
        <div className="pt-1 pb-5">
          <div className="h-16 w-40 rounded-[var(--lobb-radius-sm)] bg-[var(--lobb-border-subtle)] animate-pulse" />
          <div className="mt-3 h-px bg-[var(--lobb-border-subtle)]" />
        </div>
        <div className="mt-4 h-12 w-48 rounded-[var(--lobb-radius-sm)] bg-[var(--lobb-border-subtle)] animate-pulse" />
        <div className="mt-7 h-[58px] w-full rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-border-subtle)] animate-pulse" />
        <div className="mt-7 h-14 w-full rounded-none bg-[var(--lobb-border-subtle)] animate-pulse" />
      </section>
    </OnboardingShell>
  );
}
