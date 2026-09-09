"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Fingerprint, KeyRound, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { OnboardingShell } from "@/features/auth/onboarding-shell";
import { createClient } from "@/lib/supabase/client";
import { setPendingAuth } from "@/lib/auth-flow";
import { resolvePostAuthPath } from "@/lib/auth-redirect";
import { browserSupportsPasskeys, passkeyErrorMessage, passkeysEnabled, signInWithPasskey } from "@/lib/auth-passkey";
import { track } from "@/lib/analytics";

export function AuthLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || undefined;
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [alternativeError, setAlternativeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);

  useEffect(() => setShowPasskey(passkeysEnabled() && browserSupportsPasskeys()), []);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const busy = loading || sendingCode || passkeyBusy;
  const canSubmit = hasValidEmail && password.length > 0 && !busy;

  const clearErrors = () => {
    setPasswordError("");
    setFormError("");
    setAlternativeError("");
  };

  const goToApp = async (userId: string, method: "password" | "passkey") => {
    const supabase = createClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    track("User Signed In", { role: profile?.role ?? "unknown", method });
    router.replace(await resolvePostAuthPath(supabase, userId, { nextPath }));
    router.refresh();
  };

  const signInWithPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    clearErrors();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        session?: { access_token: string; refresh_token: string };
        user?: { id: string };
      } | null;
      if (!response.ok || !payload?.session || !payload.user) {
        setPasswordError(response.status === 401 ? "That email and password do not match." : payload?.error || "We could not sign you in. Try again.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.setSession(payload.session);
      if (error) {
        setFormError("We could not start your session. Try again.");
        return;
      }
      await goToApp(payload.user.id, "password");
    } catch {
      setFormError("We could not reach LOBB. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const requestCode = async (reset = false) => {
    if (busy) return;
    clearErrors();
    if (!hasValidEmail) {
      setAlternativeError("Enter your email address above first.");
      setShowAlternatives(true);
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setAlternativeError(result?.error || "We could not send a verification code. Try again.");
        setShowAlternatives(true);
        return;
      }
      setPendingAuth({
        email: email.trim().toLowerCase(),
        mode: "login",
        sentAt: Date.now(),
        nextPath: reset ? `/auth/secure?reset=1&next=${encodeURIComponent(nextPath || "/home")}` : nextPath,
      });
      router.push("/auth/verify");
    } catch {
      setAlternativeError("We could not send a verification code. Check your connection and try again.");
      setShowAlternatives(true);
    } finally {
      setSendingCode(false);
    }
  };

  const usePasskey = async () => {
    if (busy) return;
    clearErrors();
    setPasskeyBusy(true);
    try {
      const { user } = await signInWithPasskey();
      if (!user) throw new Error("missing user");
      await goToApp(user.id, "passkey");
    } catch (error) {
      setAlternativeError(passkeyErrorMessage(error));
    } finally {
      setPasskeyBusy(false);
    }
  };

  return (
    <OnboardingShell backHref="/">
      <form onSubmit={signInWithPassword} className="flex flex-1 flex-col pb-10">
        <div className="pt-3">
          <p className="text-sm font-medium text-[var(--lobb-clay)]">Welcome back</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-tight text-[var(--lobb-text-primary)] sm:text-[42px]">Sign in to LOBB</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[var(--lobb-text-secondary)]">Use the email and password connected to your account.</p>
        </div>

        <Field label="Email address" className="mt-8">
          <Input autoFocus type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" />
        </Field>
        <Field label="Password" className="mt-4" error={passwordError || undefined}>
          <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" />
        </Field>

        <div className="mt-2 flex justify-end">
          <Button type="button" variant="link" size="sm" onClick={() => requestCode(true)} disabled={busy}>Reset password</Button>
        </div>
        {formError && <FormAlert className="mt-3">{formError}</FormAlert>}
        <Button type="submit" disabled={!canSubmit} size="lg" className="mt-6 w-full">
          {loading ? <><Loader2 className="size-4 animate-spin" />Signing in</> : <><KeyRound className="size-4" />Sign in</>}
        </Button>

        <div className="mt-5 border-t border-[var(--lobb-border-subtle)] pt-5">
          <Button type="button" variant="ghost" className="w-full justify-between" aria-expanded={showAlternatives} onClick={() => setShowAlternatives((current) => !current)}>
            Use a different sign-in method
            <ChevronDown className={`size-4 transition-transform ${showAlternatives ? "rotate-180" : ""}`} />
          </Button>
          {showAlternatives && (
            <div className="mt-3 space-y-2 rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-secondary)] p-3">
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => requestCode(false)} disabled={busy}>
                {sendingCode ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Email a verification code
              </Button>
              {showPasskey && (
                <Button type="button" variant="outline" size="lg" className="w-full" onClick={usePasskey} disabled={busy}>
                  {passkeyBusy ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />} Use a passkey
                </Button>
              )}
              {alternativeError && <FormAlert>{alternativeError}</FormAlert>}
            </div>
          )}
        </div>

        <p className="mt-auto pt-10 text-center text-sm text-[var(--lobb-text-secondary)]">
          New to LOBB? <Link href="/auth/signup" className="font-medium text-[var(--lobb-clay)] hover:underline">Create an account</Link>
        </p>
      </form>
    </OnboardingShell>
  );
}
