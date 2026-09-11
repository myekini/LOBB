"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Input as LobbInput } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormAlert } from "@/components/ui/form-alert";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OnboardingShell } from "@/features/auth/onboarding-shell";
import { clearPendingAuth, getPendingAuth, setPendingAuth } from "@/lib/auth-flow";
import { track } from "@/lib/analytics";

// Must match the "Email OTP Length" setting in Supabase Auth (standard: 6).
// Override with NEXT_PUBLIC_OTP_LENGTH if the dashboard setting changes.
const OTP_LENGTH = Math.min(10, Math.max(6, Number(process.env.NEXT_PUBLIC_OTP_LENGTH) || 6));

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

  if ((nextPath.startsWith("/home") || nextPath.startsWith("/dashboard") || nextPath.startsWith("/profile") || nextPath.startsWith("/book")) && role === "coach") {
    return null;
  }

  return nextPath;
}

export default function VerifyPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingAuth = useMemo(() => (typeof window === "undefined" ? null : getPendingAuth()), []);
  const code = digits.join("");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!pendingAuth) {
      router.replace("/auth/login");
      return;
    }

    // OTP codes expire after ~10 min — if the stored request is stale, start over
    const ageMs = Date.now() - (pendingAuth.sentAt ?? 0);
    if (ageMs > 12 * 60 * 1000) {
      clearPendingAuth();
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
    if (!pendingAuth || nextCode.length < 6 || verifying) {
      return;
    }

    setError("");
    setVerifying(true);

    let response: Response;
    try {
      response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pendingAuth.email ? { email: pendingAuth.email } : { phone: pendingAuth.phone }),
          code: nextCode,
          ...(pendingAuth.role ? { role: pendingAuth.role } : {}),
        }),
      });
    } catch {
      setVerifying(false);
      fail("Could not reach LOBB. Check your connection and try again.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      session?: {
        access_token: string;
        refresh_token: string;
      };
      user?: {
        id: string;
      };
    } | null;

    if (!response.ok || !payload?.session || !payload.user) {
      setVerifying(false);
      fail(payload?.error || "Wrong code. Try again.");
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

    if (pendingAuth.mode === "signup" && pendingAuth.acceptedLegalDocuments?.length) {
      await fetch("/api/legal/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: pendingAuth.acceptedLegalDocuments,
          metadata: { source: "signup" },
        }),
      }).catch(() => null);
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

    // After a signup verification, send the user through /auth/secure once so
    // they can set a password (and optionally a passkey). It short-circuits to
    // `next` if they already have a password, so it's a no-op for returning
    // users who re-verified by email.
    const routeAfterAuth = (path: string) => {
      if (pendingAuth.mode === "signup" && !path.startsWith("/auth/secure")) {
        router.replace(`/auth/secure?next=${encodeURIComponent(path)}`);
      } else {
        router.replace(path);
      }
    };

    const safeNextPath = getSafeNextPath(pendingAuth.nextPath, profile?.role);

    if (safeNextPath && profile?.role && profile.full_name) {
      track("User Signed In", { role: profile.role });
      routeAfterAuth(safeNextPath);
      return;
    }

    const intendedRole = pendingAuth.role;

    if (profile?.role === "coach") {
      track("User Signed In", { role: "coach" });
      routeAfterAuth(profile.full_name ? "/coach/dashboard" : "/auth/setup/coach/1");
      return;
    }

    if (profile?.role === "admin") {
      track("User Signed In", { role: "admin" });
      routeAfterAuth("/admin");
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
        routeAfterAuth("/auth/setup/coach/1");
        return;
      }
      track("User Signed In", { role: "player" });
      routeAfterAuth(profile.full_name ? "/home" : "/auth/setup/player");
      return;
    }

    // No profile row yet — set role from intent and route directly.
    if (intendedRole === "coach" || intendedRole === "player") {
      await supabase.from("profiles").upsert(
        { id: userId, role: intendedRole, ...(pendingAuth.phone ? { phone_number: pendingAuth.phone } : {}) },
        { onConflict: "id" }
      );
      track("User Signed In", { role: intendedRole });
      routeAfterAuth(intendedRole === "coach" ? "/auth/setup/coach/1" : "/auth/setup/player");
      return;
    }

    // No role, no intent — show the picker
    routeAfterAuth("/auth/role");
  };

  const fillAllDigits = (value: string) => {
    const numeric = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!numeric) return;
    const next = Array(OTP_LENGTH).fill("").map((_, i) => numeric[i] ?? "");
    setDigits(next);
    const nextCode = next.join("");
    const focusIndex = Math.min(numeric.length, OTP_LENGTH - 1);
    inputs.current[focusIndex]?.focus();
    if (nextCode.replace(/\s/g, "").length === OTP_LENGTH) verify(nextCode);
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

    if (numeric && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const nextCode = next.join("");
    if (nextCode.length === OTP_LENGTH) {
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
      return;
    }

    setPendingAuth({ ...pendingAuth, sentAt: Date.now() });

    setSeconds(60);
    setDigits(Array(OTP_LENGTH).fill(""));
    setError("");
    setResendMessage("A new verification code was sent.");
    inputs.current[0]?.focus();
  };

  return (
    <OnboardingShell>
      <section className="flex flex-1 flex-col pb-10">

        {/* ── Wordmark hero strip ───────────────────────────────────────── */}
        <div className="pt-1 pb-5">
          <div className="flex items-end gap-3">
            <span className="text-[58px] font-semibold leading-none tracking-[-0.03em] text-[var(--lobb-bg-inverse)] sm:text-[68px]">
              LOBB
            </span>
            <span className="mb-2 text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--lobb-text-tertiary)]">
              Find · Book · Play
            </span>
          </div>
          <div className="mt-3 h-px bg-[var(--lobb-border-subtle)]" />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <h1 className="text-[34px] font-semibold leading-[1.04] tracking-tight text-[var(--lobb-bg-inverse)] sm:text-[40px]">
            Verify your email
          </h1>
        </div>

        {/* ── Info pill ────────────────────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-2.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)]/15 bg-[var(--lobb-clay)]/6 px-3.5 py-2.5">
          <span className="text-[12px] font-medium leading-snug text-[var(--lobb-text-secondary)]">
            Enter the six-digit code sent to {pendingAuth ? displayIdentifier(pendingAuth) : "your email"}.
          </span>
        </div>

        {/* ── OTP digit inputs ─────────────────────────────────────────── */}
        <div className="mt-9">
          <div
            className={`grid gap-2 ${isShaking ? "animate-[shake_0.35s_ease-in-out]" : ""}`}
            style={{ gridTemplateColumns: `repeat(${OTP_LENGTH}, minmax(0, 1fr))` }}
          >
            {digits.map((digit, index) => (
              <LobbInput
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                aria-label={`Digit ${index + 1}`}
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                  }
                }}
                className={`h-[60px] rounded-[var(--lobb-radius-lg)] border bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)] text-center text-[22px] font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.06)] outline-none transition-all duration-300 focus:-translate-y-1 focus:border-[var(--lobb-clay)] focus:bg-[var(--lobb-bg-elevated)] focus:shadow-[0_8px_32px_rgba(196,98,45,0.15)] ${
                  error
                    ? "border-[var(--lobb-border-error)]/50 text-[var(--lobb-border-error)] focus:border-[var(--lobb-border-error)] focus:shadow-[0_8px_32px_rgba(214,64,69,0.15)]"
                    : "border-[var(--lobb-border-subtle)]"
                }`}
              />
            ))}
          </div>
          {error && <FormAlert className="mt-4">{error}</FormAlert>}
          {resendMessage && <FormAlert className="mt-4" variant="success">{resendMessage}</FormAlert>}
        </div>

        {/* ── Resend ───────────────────────────────────────────────────── */}
        <p className="mt-5 text-center text-[11px] font-medium text-[var(--lobb-text-tertiary)]">
          Not seeing the email? Check your spam or junk folder.
        </p>

        <LobbButton variant="unstyled"
          type="button"
          disabled={seconds > 0}
          onClick={resend}
          className="mt-7 mx-auto w-fit flex rounded-[var(--lobb-radius-lg)] border border-transparent px-6 py-2.5 text-[12px] font-bold tracking-wide text-[var(--lobb-text-secondary)] transition-all hover:border-[var(--lobb-border-subtle)] hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)] disabled:cursor-default disabled:text-[var(--lobb-text-tertiary)]/40 disabled:hover:border-transparent disabled:hover:bg-transparent"
        >
          {seconds > 0
            ? `Resend code (0:${String(seconds).padStart(2, "0")})`
            : "Resend code"}
        </LobbButton>

        <div className="mt-auto pb-8 pt-10 text-center">
          <p className="inline-flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--lobb-text-secondary)]">
            {verifying && <Loader2 className="size-4 animate-spin text-[var(--lobb-clay)]" />}
            {verifying
              ? "Checking your code…"
              : code.length === OTP_LENGTH
              ? "Submitting…"
              : `Enter all ${OTP_LENGTH} digits to continue.`}
          </p>
        </div>
      </section>
    </OnboardingShell>
  );
}
