"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { clearPendingAuth, getPendingAuth } from "@/lib/auth-flow";
import { showLobbToast } from "@/providers/lobb-global-state";
import { track } from "@/lib/analytics";

function displayPhone(phone: string) {
  return phone.replace("+234", "+234 ").replace(/(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

function getSafeNextPath(nextPath: string | undefined, role: string | undefined) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (nextPath.startsWith("/admin") && role !== "admin") {
    return null;
  }

  if (nextPath.startsWith("/coach") && role !== "coach" && role !== "admin") {
    return null;
  }

  if ((nextPath.startsWith("/dashboard") || nextPath.startsWith("/profile") || nextPath.startsWith("/book")) && role === "coach") {
    return null;
  }

  return nextPath;
}

export default function VerifyPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingAuth = useMemo(() => (typeof window === "undefined" ? null : getPendingAuth()), []);
  const code = digits.join("");
  const roleLabel = pendingAuth?.role === "coach" ? "Coach signup" : pendingAuth?.role === "admin" ? "Admin access" : "Player sign in";
  const RoleIcon = pendingAuth?.role === "coach" ? GraduationCap : Trophy;

  useEffect(() => {
    if (!pendingAuth) {
      router.replace("/auth/login");
      return;
    }

    inputs.current[0]?.focus();
  }, [pendingAuth, router]);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const fail = (message: string) => {
    setError(message);
    setIsShaking(true);
    window.setTimeout(() => setIsShaking(false), 450);
  };

  const verify = async (nextCode = code) => {
    if (!pendingAuth || nextCode.length !== 6) {
      return;
    }

    setError("");
    setVerifying(true);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: pendingAuth.phone, code: nextCode, ...(pendingAuth.role ? { role: pendingAuth.role } : {}) }),
    });
    const payload = (await response.json()) as {
      error?: string;
      session?: {
        access_token: string;
        refresh_token: string;
      };
      user?: {
        id: string;
      };
    };

    if (!response.ok || !payload.session || !payload.user) {
      setVerifying(false);
      fail(payload.error || "Wrong code. Try again.");
      return;
    }

    const supabase = createClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: payload.session.access_token,
      refresh_token: payload.session.refresh_token,
    });

    if (sessionError) {
      setVerifying(false);
      fail("Could not start your session. Try again.");
      return;
    }

    clearPendingAuth();

    const userId = payload.user.id;
    if (!userId) {
      setVerifying(false);
      fail("Could not start your session. Try again.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .maybeSingle();

    const safeNextPath = getSafeNextPath(pendingAuth.nextPath, profile?.role);

    if (safeNextPath && profile?.role && profile.full_name) {
      track("User Signed In", { role: profile.role });
      router.push(safeNextPath);
      return;
    }

    const intendedRole = pendingAuth.role;

    if (profile?.role === "coach") {
      track("User Signed In", { role: "coach" });
      router.push(profile.full_name ? "/coach/dashboard" : "/auth/setup/coach/1");
      return;
    }

    if (profile?.role === "admin") {
      track("User Signed In", { role: "admin" });
      router.push("/admin");
      return;
    }

    if (profile?.role === "player") {
      // DB triggers often create a default player profile on first sign-up.
      // If the user explicitly chose "coach" and has never completed onboarding,
      // correct the role and send them to coach setup.
      if (intendedRole === "coach" && !profile.full_name) {
        await supabase
          .from("profiles")
          .update({ role: "coach" })
          .eq("id", userId);
        track("User Signed In", { role: "coach" });
        router.push("/auth/setup/coach/1");
        return;
      }
      track("User Signed In", { role: "player" });
      router.push(profile.full_name ? "/" : "/auth/setup/player");
      return;
    }

    // No profile row yet — set role from intent and route directly.
    if (intendedRole === "coach" || intendedRole === "player") {
      await supabase.from("profiles").upsert(
        { id: userId, role: intendedRole, phone_number: pendingAuth.phone },
        { onConflict: "id" }
      );
      track("User Signed In", { role: intendedRole });
      router.push(intendedRole === "coach" ? "/auth/setup/coach/1" : "/auth/setup/player");
      return;
    }

    // No role, no intent — show the picker
    router.push("/auth/role");
  };

  const updateDigit = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, "");

    if (numeric.length > 1) {
      const next = [...digits];
      numeric
        .slice(0, 6)
        .split("")
        .forEach((digit, digitIndex) => {
          next[digitIndex] = digit;
        });
      setDigits(next);
      const nextCode = next.join("");
      if (nextCode.length === 6) {
        verify(nextCode);
      }
      return;
    }

    const next = [...digits];
    next[index] = numeric;
    setDigits(next);

    if (numeric && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    const nextCode = next.join("");
    if (nextCode.length === 6) {
      verify(nextCode);
    }
  };

  const resend = async () => {
    if (!pendingAuth) {
      return;
    }

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: pendingAuth.phone, ...(pendingAuth.role ? { role: pendingAuth.role } : {}) }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      fail(result?.error || "Could not resend code. Try again.");
      showLobbToast({ type: "error", message: "Could not resend code. Try again." });
      return;
    }

    setSeconds(60);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    inputs.current[0]?.focus();
    showLobbToast({ type: "success", message: "New WhatsApp code sent." });
  };

  return (
    <OnboardingShell>
      <section className="flex flex-1 flex-col pt-3">
        <div>
          <div className="flex items-center justify-between">
            <OnboardingKicker>WhatsApp code</OnboardingKicker>
            {pendingAuth?.role && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lobb-clay)]/10 px-2.5 py-1 border border-[var(--lobb-clay)]/20 animate-in fade-in duration-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lobb-clay)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--lobb-clay)]"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <OnboardingTitle>
            Check your
            <br />
            WhatsApp
          </OnboardingTitle>
          <OnboardingCopy>
            Code sent to {pendingAuth ? displayPhone(pendingAuth.phone) : "+234"}.
          </OnboardingCopy>
          <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]">
              <RoleIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-black text-[var(--lobb-text-primary)]">{roleLabel}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--lobb-text-secondary)]">
                {pendingAuth?.role === "coach"
                  ? "After verification you will complete coach profile, email, availability, and review details."
                  : "After verification you will finish your player profile and add email for booking updates."}
              </p>
            </div>
          </div>
          {pendingAuth?.devCode && (
            <p className="mt-4 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--lobb-text-secondary)]">
              Dev account code: <span className="text-[var(--lobb-text-primary)]">{pendingAuth.devCode}</span>
            </p>
          )}
        </div>

        <div className="mt-9">
          <div className={`grid grid-cols-6 gap-2 ${isShaking ? "animate-[shake_0.35s_ease-in-out]" : ""}`}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element;
                }}
                aria-label={`Digit ${index + 1}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                className={`h-14 rounded-[12px] border bg-[var(--lobb-bg-elevated)] text-center text-xl font-black text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] outline-none transition-all duration-200 focus:scale-105 focus:border-[var(--lobb-border-focus)] focus:ring-3 focus:ring-[var(--lobb-clay)]/15 ${
                  error ? "border-[var(--lobb-border-error)] focus:border-[var(--lobb-border-error)] focus:ring-[var(--lobb-error)]/10 focus:shadow-none" : "border-[var(--lobb-border-subtle)]"
                }`}
              />
            ))}
          </div>
          {error && <p className="mt-4 text-sm font-semibold text-[var(--lobb-error)]">{error}</p>}
        </div>

        <button
          type="button"
          disabled={seconds > 0}
          onClick={resend}
          className="mt-6 rounded-full py-3 text-center text-sm font-bold text-[var(--lobb-clay)] transition hover:bg-[var(--lobb-bg-secondary)] disabled:cursor-default disabled:text-[var(--lobb-text-tertiary)] disabled:opacity-70"
        >
          {seconds > 0 ? `Resend code (0:${String(seconds).padStart(2, "0")})` : "Resend code"}
        </button>

        <div className="mt-auto pb-8 text-center">
          <p className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--lobb-text-secondary)]">
            {verifying && <Loader2 className="size-4 animate-spin text-[var(--lobb-clay)]" />}
            {verifying ? "Checking your code..." : code.length === 6 ? "Submitting automatically..." : "Enter all 6 digits to continue."}
          </p>
        </div>
      </section>
    </OnboardingShell>
  );
}
