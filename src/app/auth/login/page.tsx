"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/components/onboarding-shell";
import { setPendingAuth } from "@/lib/auth-flow";
import { formatNigerianPhoneNumber } from "@/lib/phone";

function nationalDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("234")) {
    return digits.slice(3, 13);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

function formatNationalPhone(value: string) {
  const digits = nationalDigits(value);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)].filter(Boolean);
  return parts.join(" ");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "signup";
  const nextPath = searchParams.get("next") || undefined;
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const digits = useMemo(() => nationalDigits(phone), [phone]);
  const formattedPhone = useMemo(() => formatNationalPhone(phone), [phone]);
  const isReady = digits.length === 10;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReady || loading) {
      return;
    }

    const e164Phone = formatNigerianPhoneNumber(digits);
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: e164Phone }),
    });

    setLoading(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error || "Could not send code. Try again.");
      return;
    }

    setPendingAuth({ phone: e164Phone, mode, sentAt: Date.now(), nextPath });
    router.push("/auth/verify");
  };

  return (
    <OnboardingShell>
      <form onSubmit={submit} className="flex flex-1 flex-col pt-3">
        <section>
          <OnboardingKicker>WhatsApp login</OnboardingKicker>
          <OnboardingTitle>
            Enter your
            <br />
            phone number
          </OnboardingTitle>
          <OnboardingCopy>
            We&apos;ll send a 6-digit code to your WhatsApp. Nigeria only for the MVP.
          </OnboardingCopy>
        </section>

        <section className="mt-9">
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
          <div className="mt-4 rounded-2xl border border-[var(--lobb-border)] bg-white/55 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--lobb-green)]">
              Secure access
            </p>
            <p className="mt-2 text-sm leading-5 text-[var(--lobb-muted)]">
              No password to remember. Your phone number is used to keep bookings and coach messages in one place.
            </p>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        </section>

        <div className="mt-auto pb-8">
          <p className="mb-4 px-4 text-center text-xs font-semibold leading-4 text-[var(--lobb-muted)]">
            By continuing you agree to our{" "}
            <span className="text-[var(--lobb-black)]">Terms</span> &amp;{" "}
            <span className="text-[var(--lobb-black)]">Privacy Policy</span>
          </p>
          <OnboardingButton type="submit" disabled={!isReady || loading}>
            {loading ? "Sending..." : "Send Code"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
