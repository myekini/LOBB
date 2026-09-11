"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Input as LobbInput } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Fingerprint, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { FormAlert } from "@/components/ui/form-alert";
import { createClient } from "@/lib/supabase/client";
import {
  browserSupportsPasskeys,
  passkeyErrorMessage,
  passkeysEnabled,
  registerPasskey,
} from "@/lib/auth-passkey";
import { track } from "@/lib/analytics";

const MIN_LENGTH = 8;

type State = {
  role: string | null;
  hasPassword: boolean;
  hasPasskey: boolean;
};

export default function AccountSecurityPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  const [pkError, setPkError] = useState("");
  const [pkBusy, setPkBusy] = useState(false);
  const [pkAdded, setPkAdded] = useState(false);

  const canOfferPasskey = passkeysEnabled() && browserSupportsPasskeys();

  const load = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/login?next=/account/security");
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("profiles")
      .select("role, has_password, has_passkey")
      .eq("id", user.id)
      .maybeSingle();
    setState({
      role: data?.role ?? null,
      hasPassword: Boolean(data?.has_password),
      hasPasskey: Boolean(data?.has_passkey),
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backHref = state?.role === "coach" ? "/coach/settings" : "/profile";

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pwSaving) return;
    if (password.length < MIN_LENGTH) {
      setPwError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setPwError("The two passwords don't match.");
      return;
    }
    setPwError("");
    setPwSaving(true);

    const response = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    setPwSaving(false);

    if (!response.ok) {
      setPwError(result?.error || "Could not save your password. Try again.");
      return;
    }

    track("Password Set");
    setPassword("");
    setConfirm("");
    setPwDone(true);
    setState((s) => (s ? { ...s, hasPassword: true } : s));
  };

  const addPasskey = async () => {
    if (pkBusy) return;
    setPkError("");
    setPkBusy(true);
    try {
      await registerPasskey();
      if (userId) {
        await createClient().from("profiles").update({ has_passkey: true }).eq("id", userId);
      }
      track("Passkey Registered");
      setPkAdded(true);
      setState((s) => (s ? { ...s, hasPasskey: true } : s));
    } catch (err) {
      setPkError(passkeyErrorMessage(err));
    } finally {
      setPkBusy(false);
    }
  };

  if (!state) {
    return (
      <main className="lobb-app-page flex min-h-screen items-center justify-center text-[var(--lobb-text-tertiary)]">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  }

  return (
    <main className="lobb-app-page min-h-screen pb-24 text-[var(--lobb-text-primary)]">
      <div className="mx-auto max-w-lg px-5 pt-8 sm:px-6">
        <LobbButton variant="unstyled"
          type="button"
          onClick={() => router.push(backHref)}
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--lobb-text-secondary)] transition hover:text-[var(--lobb-text-primary)]"
        >
          <ArrowLeft className="size-4" />
          Back
        </LobbButton>

        <h1 className="text-2xl font-semibold tracking-tight">Sign-in &amp; security</h1>
        <p className="mt-1.5 text-sm font-medium text-[var(--lobb-text-secondary)]">
          Set a password or a passkey so you can sign in without waiting for an email code.
        </p>

        {/* ── Password ─────────────────────────────────────────────────── */}
        <section className="mt-7 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
              <KeyRound className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">Password</p>
              <p className="mt-0.5 text-[12px] text-[var(--lobb-text-tertiary)]">
                {state.hasPassword ? "A password is set on this account." : "No password yet."}
              </p>
            </div>
            {state.hasPassword && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--lobb-success)]">
                <Check className="size-3.5" /> Active
              </span>
            )}
          </div>

          {pwDone ? (
            <FormAlert className="mt-4" variant="info" title="Password saved">
              Use it next time you sign in.
            </FormAlert>
          ) : (
            <form onSubmit={savePassword} className="mt-4 space-y-3">
              <LobbInput
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={state.hasPassword ? "New password" : "Password (min 8 characters)"}
                className="h-12 w-full rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-4 text-[14px] font-medium text-[var(--lobb-text-primary)] outline-none focus:border-[var(--lobb-clay)]/50"
              />
              <LobbInput
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                className="h-12 w-full rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-4 text-[14px] font-medium text-[var(--lobb-text-primary)] outline-none focus:border-[var(--lobb-clay)]/50"
              />
              {pwError && <FormAlert>{pwError}</FormAlert>}
              <LobbButton variant="unstyled"
                type="submit"
                disabled={pwSaving || password.length < MIN_LENGTH || confirm.length === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay)] text-[13px] font-medium uppercase tracking-widest text-white transition hover:bg-[var(--lobb-clay-dark)] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]"
              >
                {pwSaving && <Loader2 className="size-4 animate-spin" />}
                {state.hasPassword ? "Update password" : "Set password"}
              </LobbButton>
            </form>
          )}
        </section>

        {/* ── Passkey ──────────────────────────────────────────────────── */}
        {canOfferPasskey && (
          <section className="mt-4 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                <Fingerprint className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">Passkey</p>
                <p className="mt-0.5 text-[12px] text-[var(--lobb-text-tertiary)]">
                  Face ID, fingerprint, or device PIN — nothing to type.
                </p>
              </div>
              {state.hasPasskey && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--lobb-success)]">
                  <Check className="size-3.5" /> Active
                </span>
              )}
            </div>

            {pkAdded ? (
              <FormAlert className="mt-4" variant="info" title="Passkey added">
                You can now sign in with it on this device.
              </FormAlert>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-2.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-3.5">
                  <ShieldCheck className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                  <p className="text-[12px] font-medium text-[var(--lobb-text-secondary)]">
                    Phishing-resistant and never leaves your device.
                  </p>
                </div>
                {pkError && <FormAlert className="mt-3">{pkError}</FormAlert>}
                <LobbButton variant="unstyled"
                  type="button"
                  onClick={addPasskey}
                  disabled={pkBusy}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)]/40 bg-[var(--lobb-clay)]/5 text-[13px] font-medium uppercase tracking-widest text-[var(--lobb-clay)] transition hover:bg-[var(--lobb-clay)]/10 disabled:opacity-50"
                >
                  {pkBusy ? <Loader2 className="size-4 animate-spin" /> : <Fingerprint className="size-4" />}
                  {state.hasPasskey ? "Add another passkey" : "Add a passkey"}
                </LobbButton>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
