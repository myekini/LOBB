"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Trophy } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { setPendingAuth } from "@/lib/auth-flow";
import { createClient } from "@/lib/supabase/client";

// Only visible when the dedicated dev-login switch is enabled.
const IS_DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_LOBB_DEV_LOGIN === "true";
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

// ─── Dev quick-login panel ────────────────────────────────────────────────────
function DevLoginPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState<LoginRole | null>(null);

  const quickLogin = async (role: LoginRole) => {
    setBusy(role);
    try {
      const res = await fetch("/api/dev/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json() as {
        session?: { access_token: string; refresh_token: string };
        role?: string;
        error?: string;
      };

      if (!res.ok || !json.session) {
        alert(json.error ?? "Quick login failed");
        return;
      }

      const supabase = createClient();
      await supabase.auth.setSession({
        access_token:  json.session.access_token,
        refresh_token: json.session.refresh_token,
      });

      router.push(role === "admin" ? "/admin" : role === "coach" ? "/coach/dashboard" : "/");
    } catch {
      alert("Network error during quick login");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-8 rounded-[24px] border border-[#D96B27]/20 bg-gradient-to-br from-[#D96B27]/5 to-transparent p-5 backdrop-blur-sm animate-in fade-in duration-300 relative overflow-hidden">
      <div className="flex items-center justify-center gap-2 relative z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D96B27] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D96B27]"></span>
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D96B27]">
          Dev Access
        </p>
      </div>
      <p className="mt-1.5 text-center text-xs font-semibold text-[#D96B27]/60 relative z-10">
        One-click local access, hidden when production login is enabled.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2 relative z-10">
        {(["player", "coach", "admin"] as const).map((role) => (
          <button
            key={role}
            onClick={() => quickLogin(role)}
            disabled={busy !== null}
            className="group flex h-[52px] flex-col items-center justify-center rounded-2xl border border-[#D96B27]/20 bg-[#D96B27]/[0.02] text-[11px] font-black tracking-tight text-[#D96B27] transition-all hover:border-[#D96B27]/40 hover:bg-[#D96B27]/10 active:scale-[0.96] disabled:opacity-50"
          >
            {busy === role ? (
              <Loader2 className="size-4 animate-spin text-[#D96B27]" />
            ) : (
              <>
                <span className="capitalize uppercase tracking-wider">{role}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function getIntentRole(searchParams: ReturnType<typeof useSearchParams>): LoginRole | undefined {
  const raw = searchParams.get("role");
  // Admin intent is dev-only; coach is production-safe (public join flow)
  if (raw === "coach") return "coach";
  if (raw === "admin" && IS_DEV_LOGIN_ENABLED) return "admin";
  return undefined;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || undefined;
  const intentRole = getIntentRole(searchParams);
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [selectedRole, setSelectedRole] = useState<PublicLoginRole>(intentRole === "coach" ? "coach" : "player");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || loading) return;

    setError("");
    setLoading(true);

    const roleToSend: LoginRole | undefined = intentRole === "admin" ? "admin" : authMode === "signup" ? selectedRole : undefined;

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), ...(roleToSend ? { role: roleToSend } : {}) }),
    });

    setLoading(false);

    const result = (await response.json().catch(() => null)) as {
      error?: string;
      devCode?: string;
    } | null;

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
      ...(result?.devCode ? { devCode: result.devCode } : {}),
    });
    router.push("/auth/verify");
  };

  const selectedOption = roleOptions.find((option) => option.role === selectedRole) ?? roleOptions[0];
  const titleLines = authMode === "signup"
    ? selectedRole === "coach"
      ? ["Coach", "Sign up"]
      : ["Player", "Sign up"]
    : ["Welcome", "back"];
  const submitLabel = authMode === "signup" ? "Send sign-up code" : "Send login code";

  return (
    <OnboardingShell>
      <form onSubmit={submit} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>LOBB · {authMode === "signup" ? "Join" : "Access"}</OnboardingKicker>
          <OnboardingTitle>
            {titleLines[0]}
            <br />
            {titleLines[1]}
          </OnboardingTitle>
          <OnboardingCopy>
            {authMode === "signup"
              ? `Create your ${selectedOption.title.toLowerCase()} profile. We'll send a 6-digit magic code to verify your email.`
              : "Enter your registered email. We'll send a 6-digit magic code for secure, passwordless access."}
          </OnboardingCopy>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-2 rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-1.5 backdrop-blur-md" aria-label="Choose sign up or log in">
          {([
            ["signup", "Sign up"],
            ["login", "Log in"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setAuthMode(mode)}
              className={`h-11 rounded-[14px] text-[13px] font-bold transition-all active:scale-[0.98] ${
                authMode === mode
                  ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/[0.08]"
                  : "text-white/40 hover:text-white/80 border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </section>

        {authMode === "signup" ? (
          <section className="mt-5 rounded-full border border-white/[0.08] bg-white/[0.02] p-1.5 backdrop-blur-md flex" aria-label="Choose account type">
            {roleOptions.map((option) => {
              const isSelected = selectedRole === option.role;
              const Icon = option.Icon;
              return (
                <button
                  key={option.role}
                  type="button"
                  onClick={() => setSelectedRole(option.role)}
                  className={`inline-flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full text-[13px] font-bold transition-all active:scale-[0.98] ${
                    isSelected
                      ? "bg-white/[0.08] text-white shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-white/[0.08]"
                      : "text-white/40 hover:text-white/80 border border-transparent"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {option.role === "coach" ? "Coach" : "Player"}
                </button>
              );
            })}
          </section>
        ) : (
          <div className="mt-5 rounded-[20px] border border-white/[0.04] bg-white/[0.01] px-5 py-3.5 text-center text-[12px] font-semibold text-white/40 backdrop-blur-md">
            One login works for both player and coach profiles.
          </div>
        )}

        <section className="mt-5">
          <label className="group relative flex h-16 items-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 backdrop-blur-md transition-all focus-within:border-[#D96B27]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_24px_rgba(217,107,39,0.15)]">
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="relative z-10 h-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-bold tracking-wide text-white outline-none placeholder:text-white/20 focus:ring-0"
            />
          </label>
          {error && <p className="mt-3 text-[13px] font-semibold text-red-400">{error}</p>}
        </section>

        {IS_DEV_LOGIN_ENABLED && <DevLoginPanel />}

        <div className="mt-auto pb-8 pt-8">
          <p className="mb-5 px-4 text-center text-[11px] font-semibold leading-relaxed text-white/30">
            By continuing you agree to our{" "}
            <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Terms</span> &amp;{" "}
            <span className="text-white/60 hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
          </p>
          <OnboardingButton type="submit" disabled={!isReady} loading={loading}>
            {loading ? "Sending code…" : submitLabel}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <OnboardingShell>
      <section className="flex flex-1 flex-col pt-4 relative z-10">
        <div className="h-6 w-32 rounded-full bg-white/[0.05] animate-pulse" />
        <div className="mt-6 h-20 w-56 rounded-[18px] bg-white/[0.05] animate-pulse" />
        <div className="mt-5 h-16 w-full rounded-[18px] bg-white/[0.05] animate-pulse" />
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="h-12 rounded-[16px] bg-white/[0.05] animate-pulse" />
          <div className="h-12 rounded-[16px] bg-white/[0.05] animate-pulse" />
        </div>
        <div className="mx-auto mt-4 h-4 w-56 rounded-full bg-white/[0.05] animate-pulse" />
        <div className="mt-8 h-16 rounded-2xl bg-white/[0.05] animate-pulse" />
      </section>
    </OnboardingShell>
  );
}
