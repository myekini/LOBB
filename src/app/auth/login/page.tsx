"use client";

import { Suspense, useMemo, useState } from "react";
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
import { formatNigerianPhoneNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

// Only visible when the dedicated dev-login switch is enabled.
const IS_DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_LOBB_DEV_LOGIN === "true";
type LoginRole = "player" | "coach" | "admin";
type PublicLoginRole = "player" | "coach";

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

function nationalDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits.slice(3, 13);
  if (digits.startsWith("0"))   return digits.slice(1, 11);
  return digits.slice(0, 10);
}

function formatNationalPhone(value: string) {
  const digits = nationalDigits(value);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)].filter(Boolean);
  return parts.join(" ");
}

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
    <div className="mt-8 rounded-3xl border border-[var(--lobb-clay)]/20 bg-gradient-to-br from-white to-[var(--lobb-clay)]/[0.03] p-5 shadow-[0_12px_36px_rgba(196,98,45,0.06)] animate-in fade-in duration-300">
      <div className="flex items-center justify-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lobb-clay)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--lobb-clay)]"></span>
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lobb-clay)]">
          Dev Access
        </p>
      </div>
      <p className="mt-1.5 text-center text-xs font-semibold text-[var(--lobb-muted)]">
        One-click local access, hidden when production login is enabled.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["player", "coach", "admin"] as const).map((role) => (
          <button
            key={role}
            onClick={() => quickLogin(role)}
            disabled={busy !== null}
            className="group flex h-[46px] flex-col items-center justify-center rounded-2xl border border-[var(--lobb-border)] bg-white text-[11px] font-black tracking-tight text-[var(--lobb-black)] shadow-[0_4px_12px_rgba(13,13,13,0.03)] transition-all hover:border-[var(--lobb-clay)]/40 hover:shadow-[0_8px_20px_rgba(196,98,45,0.08)] active:scale-[0.96] disabled:opacity-50"
          >
            {busy === role ? (
              <Loader2 className="size-4 animate-spin text-[var(--lobb-clay)]" />
            ) : (
              <>
                <span className="capitalize">{role}</span>
                <span className="text-[9px] font-medium text-[var(--lobb-muted)] transition-colors group-hover:text-[var(--lobb-clay)]">Local access</span>
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
  const [selectedRole, setSelectedRole] = useState<PublicLoginRole>(intentRole === "coach" ? "coach" : "player");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const digits = useMemo(() => nationalDigits(phone), [phone]);
  const formattedPhone = useMemo(() => formatNationalPhone(phone), [phone]);
  const isReady = digits.length === 10;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || loading) return;

    const e164Phone = formatNigerianPhoneNumber(digits);
    setError("");
    setLoading(true);

    // Coach intent is carried from public coach sign-up links. Local roles use Dev Access.
    const roleToSend: LoginRole | undefined = intentRole === "admin" ? "admin" : selectedRole;

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: e164Phone, ...(roleToSend ? { role: roleToSend } : {}) }),
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
      phone: e164Phone,
      mode: "login",
      sentAt: Date.now(),
      nextPath,
      ...(roleToSend ? { role: roleToSend } : {}),
      ...(result?.devCode ? { devCode: result.devCode } : {}),
    });
    router.push("/auth/verify");
  };

  const selectedOption = roleOptions.find((option) => option.role === selectedRole) ?? roleOptions[0];
  const titleLines = selectedRole === "coach" ? ["Coach", "account"] : ["Player", "account"];

  return (
    <OnboardingShell>
      <form onSubmit={submit} className="flex flex-1 flex-col pt-3">
        <section>
          <OnboardingKicker>LOBB · {selectedOption.title}</OnboardingKicker>
          <OnboardingTitle>
            {titleLines[0]}
            <br />
            {titleLines[1]}
          </OnboardingTitle>
          <OnboardingCopy>
            Enter your number. We&apos;ll send a WhatsApp code — no password needed.
          </OnboardingCopy>
        </section>

        <section className="mt-7 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-1.5 shadow-[0_10px_30px_rgba(58,43,20,0.04)]" aria-label="Choose account type">
          {roleOptions.map((option) => {
            const isSelected = selectedRole === option.role;
            const Icon = option.Icon;

            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelectedRole(option.role)}
                className={`inline-flex h-12 w-1/2 items-center justify-center gap-2 rounded-full text-sm font-black transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-[var(--lobb-black)] text-white shadow-[0_10px_22px_rgba(13,13,13,0.14)]"
                    : "text-[var(--lobb-muted)] hover:text-[var(--lobb-black)]"
                }`}
              >
                <Icon className="size-4" />
                {option.role === "coach" ? "Coach" : "Player"}
              </button>
            );
          })}
        </section>

        <section className="mt-5">
          <label className="flex h-16 items-center rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 shadow-[0_12px_40px_rgba(58,43,20,0.06)] transition focus-within:border-[var(--lobb-black)] focus-within:ring-2 focus-within:ring-black/5">
            <span className="flex items-center gap-2 border-r border-[var(--lobb-border)] pr-3 text-sm font-black text-[var(--lobb-black)]">
              <span aria-hidden="true">🇳🇬</span>
              +234
            </span>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="tel-national"
              value={formattedPhone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="8012 345 678"
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-lg font-semibold text-[var(--lobb-black)] outline-none placeholder:text-[#9b958a] focus:ring-0"
            />
          </label>
          {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        </section>

        {IS_DEV_LOGIN_ENABLED && <DevLoginPanel />}

        <div className="mt-auto pb-8">
          <p className="mb-4 px-4 text-center text-xs font-semibold leading-4 text-[var(--lobb-muted)]">
            By continuing you agree to our{" "}
            <span className="text-[var(--lobb-black)]">Terms</span> &amp;{" "}
            <span className="text-[var(--lobb-black)]">Privacy Policy</span>
          </p>
          <OnboardingButton type="submit" disabled={!isReady} loading={loading}>
            {loading ? "Sending code…" : "Send Code"}
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
      <section className="flex flex-1 flex-col pt-3">
        <div className="h-3 w-32 rounded-full lobb-skeleton" />
        <div className="mt-5 h-20 w-56 rounded-[18px] lobb-skeleton" />
        <div className="mt-5 h-14 w-full rounded-[18px] lobb-skeleton" />
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="h-12 rounded-full lobb-skeleton" />
          <div className="h-12 rounded-full lobb-skeleton" />
        </div>
        <div className="mx-auto mt-3 h-4 w-56 rounded-full lobb-skeleton" />
        <div className="mt-6 h-16 rounded-2xl lobb-skeleton" />
      </section>
    </OnboardingShell>
  );
}
