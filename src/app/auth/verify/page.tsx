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
import { clearPendingAuth, getPendingAuth, setPendingAuth } from "@/lib/auth-flow";
import { showLobbToast } from "@/providers/lobb-global-state";
import { track } from "@/lib/analytics";

function displayIdentifier(auth: { email?: string; phone?: string }) {
  if (auth.email) return auth.email;
  const phone = auth.phone ?? "";
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
    if (!pendingAuth || nextCode.length !== 6 || verifying) {
      return;
    }

    setError("");
    setVerifying(true);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(pendingAuth.email ? { email: pendingAuth.email } : { phone: pendingAuth.phone }),
        code: nextCode,
        ...(pendingAuth.role ? { role: pendingAuth.role } : {}),
      }),
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
        { id: userId, role: intendedRole, ...(pendingAuth.phone ? { phone_number: pendingAuth.phone } : {}) },
        { onConflict: "id" }
      );
      track("User Signed In", { role: intendedRole });
      router.push(intendedRole === "coach" ? "/auth/setup/coach/1" : "/auth/setup/player");
      return;
    }

    // No role, no intent — show the picker
    router.push("/auth/role");
  };

  const fillAllDigits = (value: string) => {
    const numeric = value.replace(/\D/g, "").slice(0, 6);
    if (!numeric) return;
    const next = Array(6).fill("").map((_, i) => numeric[i] ?? "");
    setDigits(next);
    const nextCode = next.join("");
    const focusIndex = Math.min(numeric.length, 5);
    inputs.current[focusIndex]?.focus();
    if (nextCode.replace(/\s/g, "").length === 6) verify(nextCode);
  };

  const updateDigit = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, "");

    if (numeric.length > 1) {
      fillAllDigits(numeric);
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

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    fillAllDigits(event.clipboardData.getData("text"));
  };

  const resend = async () => {
    if (!pendingAuth) {
      return;
    }

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(pendingAuth.email ? { email: pendingAuth.email } : { phone: pendingAuth.phone }),
        ...(pendingAuth.role ? { role: pendingAuth.role } : {}),
      }),
    });

    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      fail(result?.error || "Could not resend code. Try again.");
      showLobbToast({ type: "error", message: "Could not resend code. Try again." });
      return;
    }

    setPendingAuth({ ...pendingAuth, sentAt: Date.now() });

    setSeconds(60);
    setDigits(["", "", "", "", "", ""]);
    setError("");
    inputs.current[0]?.focus();
    showLobbToast({ type: "success", message: "New code sent." });
  };

  return (
    <OnboardingShell>
      <section className="flex flex-1 flex-col pt-4 relative z-10">
        <div>
          <div className="flex items-center justify-between mb-2">
            <OnboardingKicker>Magic Code</OnboardingKicker>
            {pendingAuth?.role && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D96B27]/10 px-3 py-1.5 border border-[#D96B27]/20 backdrop-blur-sm animate-in fade-in duration-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D96B27] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D96B27]"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D96B27]">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
          <OnboardingTitle>
            Check your
            <br />
            {pendingAuth?.email ? "email" : "phone"}
          </OnboardingTitle>
          <OnboardingCopy>
            Code sent to {pendingAuth ? displayIdentifier(pendingAuth) : "your email"}.
          </OnboardingCopy>
          <div className="mt-6 flex items-start gap-4 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-5 backdrop-blur-md">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-surface)] text-[var(--lobb-text-primary)] border border-[var(--lobb-border)]">
              <RoleIcon className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-black text-[var(--lobb-text-primary)]">{roleLabel}</p>
              <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-[var(--lobb-text-secondary)]">
                {pendingAuth?.role === "coach"
                  ? "After verification, you will complete your coach profile, set availability, and review details."
                  : "After verification, you will complete your player profile and start booking sessions."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className={`grid grid-cols-6 gap-2 ${isShaking ? "animate-[shake_0.35s_ease-in-out]" : ""}`}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element;
                }}
                aria-label={`Digit ${index + 1}`}
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                className={`h-[60px] rounded-[16px] border bg-[var(--lobb-surface-2)] text-[var(--lobb-text-primary)] text-center text-[22px] font-black shadow-[0_4px_24px_rgba(0,0,0,0.06)] outline-none transition-all duration-300 focus:-translate-y-1 focus:border-[var(--lobb-clay)] focus:bg-[var(--lobb-surface)] focus:shadow-[0_8px_32px_rgba(196,98,45,0.15)] ${
                  error ? "border-[var(--lobb-border-error)]/50 focus:border-[var(--lobb-border-error)] text-[var(--lobb-border-error)] focus:shadow-[0_8px_32px_rgba(214,64,69,0.15)]" : "border-[var(--lobb-border)]"
                }`}
              />
            ))}
          </div>
          {error && <p className="mt-4 text-[13px] font-semibold text-[var(--lobb-error)] text-center">{error}</p>}
        </div>

        <button
          type="button"
          disabled={seconds > 0}
          onClick={resend}
          className="mt-8 mx-auto w-fit flex rounded-full px-6 py-2.5 text-[12px] font-bold tracking-wide text-[var(--lobb-text-secondary)] border border-transparent transition-all hover:text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-surface-2)] hover:border-[var(--lobb-border)] disabled:cursor-default disabled:text-[var(--lobb-text-tertiary)]/40 disabled:hover:bg-transparent disabled:hover:border-transparent"
        >
          {seconds > 0 ? `Resend code (0:${String(seconds).padStart(2, "0")})` : "Resend code"}
        </button>

        <div className="mt-auto pb-8 text-center">
          <p className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--lobb-text-secondary)]">
            {verifying && <Loader2 className="size-4 animate-spin text-[var(--lobb-clay)]" />}
            {verifying ? "Checking your code..." : code.length === 6 ? "Submitting..." : "Enter all 6 digits to continue."}
          </p>
        </div>
      </section>
    </OnboardingShell>
  );
}
