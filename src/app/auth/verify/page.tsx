"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";
import { clearPendingAuth, getPendingAuth } from "@/lib/auth-flow";
import { showLobbToast } from "@/providers/lobb-global-state";

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
      router.push(safeNextPath);
      return;
    }

    if (profile?.role === "coach") {
      router.push(profile.full_name ? "/coach/dashboard" : "/auth/setup/coach/1");
      return;
    }

    if (profile?.role === "admin") {
      router.push("/admin");
      return;
    }

    if (profile?.role === "player") {
      router.push(profile.full_name ? "/" : "/auth/setup/player");
      return;
    }

    // No role yet — if we have clear intent from the login flow, set it and skip the picker
    const intendedRole = pendingAuth.role;
    if (intendedRole === "coach" || intendedRole === "player") {
      await supabase.from("profiles").upsert(
        { id: userId, role: intendedRole, phone_number: pendingAuth.phone },
        { onConflict: "id" }
      );
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
                  {pendingAuth.role}
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
            Code sent to {pendingAuth ? displayPhone(pendingAuth.phone) : "+234"}. It expires shortly.
          </OnboardingCopy>
          {pendingAuth?.devCode && (
            <p className="mt-4 rounded-2xl border border-[var(--lobb-border)] bg-white/60 px-4 py-3 text-sm font-bold text-[var(--lobb-muted)]">
              Dev account code: <span className="text-[var(--lobb-black)]">{pendingAuth.devCode}</span>
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
                className={`h-14 rounded-2xl border bg-[var(--lobb-surface)] text-center text-xl font-black text-[var(--lobb-black)] shadow-[0_10px_24px_rgba(58,43,20,0.02)] outline-none transition-all duration-200 focus:scale-105 focus:border-[var(--lobb-clay)] focus:ring-4 focus:ring-[var(--lobb-clay)]/10 focus:shadow-[0_0_15px_rgba(196,98,45,0.15)] ${
                  error ? "border-red-600 focus:border-red-600 focus:ring-red-600/10 focus:shadow-none" : "border-[var(--lobb-border)]"
                }`}
              />
            ))}
          </div>
          {error && <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>}
        </div>

        <button
          type="button"
          disabled={seconds > 0}
          onClick={resend}
          className="mt-6 rounded-full py-3 text-center text-sm font-bold text-[var(--lobb-clay)] transition hover:bg-white/50 disabled:cursor-default disabled:text-[var(--lobb-muted)] disabled:opacity-70"
        >
          {seconds > 0 ? `Resend code (0:${String(seconds).padStart(2, "0")})` : "Resend code"}
        </button>

        <div className="mt-auto pb-8 text-center">
          <p className="text-sm font-semibold text-[var(--lobb-muted)]">
            {verifying ? "Checking your code..." : code.length === 6 ? "Submitting automatically..." : "Enter all 6 digits to continue."}
          </p>
        </div>
      </section>
    </OnboardingShell>
  );
}
