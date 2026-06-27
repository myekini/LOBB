"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Trophy } from "lucide-react";
import { OnboardingShell } from "@/features/auth/onboarding-shell";
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
  const [email, setEmail] = useState("");
  const [acceptedCoreTerms, setAcceptedCoreTerms] = useState(false);
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasAcceptedSignupLegal = authMode !== "signup" || (acceptedCoreTerms && acceptedCancellation);
  const isReady = hasValidEmail && hasAcceptedSignupLegal;

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
      }),
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
      ...(authMode === "signup"
        ? { acceptedLegalDocuments: ["terms_of_service", "privacy_policy", "cancellation_policy"] }
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

  const escapeHref = isDedicatedSignup
    ? forcedRole === "coach" ? "/auth/signup/player" : "/auth/signup/coach"
    : null;
  const escapeLabel = isDedicatedSignup
    ? forcedRole === "coach" ? "I'm a player →" : "I'm a coach →"
    : null;

  return (
    <OnboardingShell backHref="/">
      <form onSubmit={submit} className="flex flex-1 flex-col pb-10">

        {/* ── Wordmark hero strip ───────────────────────────────────────── */}
        <div className="pt-1 pb-5">
          <div className="flex items-end gap-3">
            <span className="text-[58px] font-black leading-none tracking-[-0.03em] text-[var(--lobb-black)] sm:text-[68px]">
              LOBB
            </span>
            <span className="mb-2 text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--lobb-text-tertiary)]">
              Find · Book · Play
            </span>
          </div>
          <div className="mt-3 h-px bg-[var(--lobb-border)]" />
        </div>

        {/* ── Title + step badge ────────────────────────────────────────── */}
        <div className="mt-4 flex items-start justify-between gap-3">
          <h1 className="text-[34px] font-black leading-[1.04] tracking-tight text-[var(--lobb-black)] sm:text-[40px]">
            {headingRole && <>{headingRole}<br /></>}
            {authMode === "signup" ? "Sign up" : <>Welcome<br />back</>}
          </h1>
          {authMode === "signup" && (
            <div className="mt-1.5 shrink-0 rounded-full border border-[var(--lobb-clay)]/25 bg-[var(--lobb-clay)]/8 px-3 py-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                Step 1 / 2
              </span>
            </div>
          )}
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--lobb-muted)]">
          {authMode === "signup"
            ? "We'll send a 6-digit magic code to verify your email."
            : "Enter your registered email for a secure, passwordless login code."}
        </p>

        {/* ── Underline role tabs — generic signup only ─────────────────── */}
        {authMode === "signup" && !isDedicatedSignup && (
          <div className="mt-5 flex border-b border-[var(--lobb-border)]" aria-label="Choose account type">
            {roleOptions.map((option) => {
              const isSelected = selectedRole === option.role;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => setSelectedRole(option.role)}
                  className={`-mb-px mr-5 pb-3 text-[12px] font-bold uppercase tracking-[0.13em] border-b-2 transition-all duration-200 ${
                    isSelected
                      ? "border-[var(--lobb-clay)] text-[var(--lobb-clay)]"
                      : "border-transparent text-[var(--lobb-muted)] hover:text-[var(--lobb-black)]"
                  }`}
                >
                  {option.title}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Info pill — dedicated signup ─────────────────────────────── */}
        {authMode === "signup" && isDedicatedSignup && (
          <div className="mt-5 flex items-center gap-2.5 rounded-[10px] border border-[var(--lobb-clay)]/15 bg-[var(--lobb-clay)]/6 px-3.5 py-2.5">
            <SelectedIcon className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
            <span className="text-[12px] font-semibold leading-snug text-[var(--lobb-text-secondary)]">
              {selectedOption.body}
            </span>
          </div>
        )}

        {/* ── Email input ───────────────────────────────────────────────── */}
        <div className="mt-7 flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-secondary)]">
            Email address <span className="text-[var(--lobb-clay)] normal-case">*</span>
          </label>
          <div className="group relative flex h-[58px] items-center overflow-hidden rounded-[14px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface-2)]">
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold text-[var(--lobb-black)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
            />
          </div>
          {error && (
            <p className="text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>
          )}
        </div>

        {/* ── Legal checkboxes — signup only ───────────────────────────── */}
        {authMode === "signup" && (
          <div className="mt-6 flex flex-col divide-y divide-[var(--lobb-border)]">
            <label className="flex cursor-pointer items-start gap-3.5 py-4">
              <div className="relative mt-0.5 flex shrink-0">
                <input
                  type="checkbox"
                  checked={acceptedCoreTerms}
                  onChange={(e) => setAcceptedCoreTerms(e.target.checked)}
                  className="peer size-5 appearance-none rounded-[6px] border-[1.5px] border-[var(--lobb-border)] bg-transparent checked:border-[var(--lobb-clay)] checked:bg-[var(--lobb-clay)] transition-all cursor-pointer"
                />
                {acceptedCoreTerms && (
                  <svg
                    className="pointer-events-none absolute inset-0 m-auto text-white"
                    width="10" height="8" viewBox="0 0 10 8" fill="none"
                  >
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
                I have read and agree to LOBB&apos;s{" "}
                <Link href="/terms" className="font-black text-[var(--lobb-clay)] hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-black text-[var(--lobb-clay)] hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3.5 py-4">
              <div className="relative mt-0.5 flex shrink-0">
                <input
                  type="checkbox"
                  checked={acceptedCancellation}
                  onChange={(e) => setAcceptedCancellation(e.target.checked)}
                  className="peer size-5 appearance-none rounded-[6px] border-[1.5px] border-[var(--lobb-border)] bg-transparent checked:border-[var(--lobb-clay)] checked:bg-[var(--lobb-clay)] transition-all cursor-pointer"
                />
                {acceptedCancellation && (
                  <svg
                    className="pointer-events-none absolute inset-0 m-auto text-white"
                    width="10" height="8" viewBox="0 0 10 8" fill="none"
                  >
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
                I understand that LOBB holds coach payments until sessions are completed, and I agree to the{" "}
                <Link href="/cancellation-policy" className="font-black text-[var(--lobb-clay)] hover:underline">
                  Cancellation &amp; Refund Policy
                </Link>.
              </span>
            </label>
          </div>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <div className="mt-7">
          <button
            type="submit"
            disabled={!isReady || loading}
            className="group relative flex h-14 w-full items-center justify-center overflow-hidden bg-[var(--lobb-clay)] text-[12px] font-black uppercase tracking-[0.15em] text-white shadow-[0_14px_30px_rgba(150,74,35,0.2)] transition-all duration-300 hover:bg-[var(--lobb-clay-dark)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-surface-2)] disabled:text-[var(--lobb-muted)] disabled:shadow-none disabled:transform-none"
          >
            <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-white/75" />
                Sending code…
              </span>
            ) : authMode === "signup" ? (
              "Send sign-up code"
            ) : (
              "Send login code"
            )}
          </button>

          {authMode === "login" && (
            <p className="mt-4 px-4 text-center text-[11px] font-semibold leading-relaxed text-[var(--lobb-text-tertiary)]">
              By continuing you agree to our{" "}
              <Link href="/terms" className="text-[var(--lobb-clay)]">Terms</Link> &amp;{" "}
              <Link href="/privacy" className="text-[var(--lobb-clay)]">Privacy Policy</Link>
            </p>
          )}

          {/* New to LOBB — login only */}
          {authMode === "login" && (
            <div className="mt-6">
              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--lobb-border)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
                  New to LOBB?
                </span>
                <div className="h-px flex-1 bg-[var(--lobb-border)]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/auth/signup/player"
                  className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
                >
                  <Trophy className="size-3.5" />
                  Player
                </Link>
                <Link
                  href="/auth/signup/coach"
                  className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[12px] font-bold text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-clay)]/40 hover:bg-[var(--lobb-clay)]/5 hover:text-[var(--lobb-clay)]"
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
                Already have an account? <span className="text-[var(--lobb-black)] font-black">Log in</span>
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
          <div className="h-16 w-40 rounded-[8px] bg-[var(--lobb-border)] animate-pulse" />
          <div className="mt-3 h-px bg-[var(--lobb-border)]" />
        </div>
        <div className="mt-4 h-12 w-48 rounded-[8px] bg-[var(--lobb-border)] animate-pulse" />
        <div className="mt-7 h-[58px] w-full rounded-[14px] bg-[var(--lobb-border)] animate-pulse" />
        <div className="mt-7 h-14 w-full rounded-none bg-[var(--lobb-border)] animate-pulse" />
      </section>
    </OnboardingShell>
  );
}
