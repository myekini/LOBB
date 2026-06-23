"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, Loader2 } from "lucide-react";
import {
  OnboardingButton,
  OnboardingCopy,
  OnboardingFieldLabel,
  OnboardingKicker,
  OnboardingShell,
  OnboardingTitle,
} from "@/features/auth/onboarding-shell";

type Bank = { name: string; code: string };

export default function CoachSetupBankPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const resolveAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/paystack/banks")
      .then((r) => r.json() as Promise<{ banks?: Bank[]; error?: string }>)
      .then((data) => { if (data.banks) setBanks(data.banks); })
      .catch(() => {});
  }, []);

  // Auto-resolve account name once 10 digits + bank are selected
  useEffect(() => {
    setResolvedName(null);
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) return;

    resolveAbortRef.current?.abort();
    const ctrl = new AbortController();
    resolveAbortRef.current = ctrl;
    setResolving(true);

    fetch(`/api/paystack/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json() as Promise<{ account_name?: string; error?: string }>)
      .then((data) => {
        if (data.account_name) setResolvedName(data.account_name);
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [accountNumber, bankCode]);

  const selectedBank = banks.find((b) => b.code === bankCode);
  const canContinue = /^\d{10}$/.test(accountNumber) && Boolean(bankCode) && !resolving;

  const handleBankChange = (code: string) => {
    setBankCode(code);
    setBankName(banks.find((b) => b.code === code)?.name ?? "");
    setResolvedName(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/coaches/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_number: accountNumber,
          bank_code: bankCode,
          bank_name: bankName,
        }),
      });
      const json = (await res.json()) as {
        bank?: unknown;
        account_name?: string;
        dva?: { account_number: string; bank_name: string } | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not save bank details");
      router.push("/auth/setup/coach/submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell step="6 of 6">
      <form onSubmit={submit} className="flex flex-1 flex-col pt-4 relative z-10">
        <section>
          <OnboardingKicker>Coach onboarding</OnboardingKicker>
          <OnboardingTitle>
            Set up
            <br />payouts
          </OnboardingTitle>
          <OnboardingCopy>
            Add your personal bank account. LOBB will create a dedicated earnings account in your name
            — your session payouts accumulate there, and you withdraw whenever you want.
          </OnboardingCopy>
        </section>

        <div className="mt-8 space-y-5">
          {/* Bank selector */}
          <div>
            <OnboardingFieldLabel required>Bank</OnboardingFieldLabel>
            <div className="relative mt-2">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lobb-clay)] pointer-events-none">
                <Landmark className="size-5" />
              </div>
              <select
                value={bankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="h-16 w-full appearance-none rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] pl-12 pr-5 text-[15px] font-bold text-[var(--lobb-text-primary)] outline-none transition-all focus:border-[var(--lobb-clay)]/50 focus:bg-[var(--lobb-surface)] focus:shadow-[0_0_24px_rgba(196,98,45,0.12)]"
              >
                <option value="">Select your bank</option>
                {banks.length === 0
                  ? <option disabled>Loading banks...</option>
                  : banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
              </select>
              {selectedBank && (
                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-[var(--lobb-clay)]" />
              )}
            </div>
          </div>

          {/* Account number */}
          <div>
            <OnboardingFieldLabel required>Account number</OnboardingFieldLabel>
            <div className="relative mt-2 flex h-16 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] px-5 transition-all focus-within:border-[var(--lobb-clay)]/50 focus-within:bg-[var(--lobb-surface)] focus-within:shadow-[0_0_24px_rgba(196,98,45,0.12)]">
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit account number"
                className="h-full w-full border-0 bg-transparent text-[15px] font-bold tracking-[0.06em] text-[var(--lobb-text-primary)] outline-none placeholder:font-normal placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
              {resolving && <Loader2 className="ml-3 size-4 shrink-0 animate-spin text-[var(--lobb-clay)]" />}
              {!resolving && /^\d{10}$/.test(accountNumber) && resolvedName && (
                <CheckCircle2 className="ml-3 size-5 shrink-0 text-[var(--lobb-clay)]" />
              )}
            </div>
            <p className="mt-2 text-[12px] font-semibold text-[var(--lobb-text-tertiary)]">
              Must be exactly 10 digits — your NUBAN number
            </p>
          </div>

          {/* Account name confirmation */}
          {resolvedName && (
            <div className="rounded-[16px] border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay)]/[0.06] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Account name</p>
              <p className="mt-1.5 text-[15px] font-black text-[var(--lobb-text-primary)]">{resolvedName}</p>
              <p className="mt-1 text-[12px] font-medium text-[var(--lobb-text-secondary)]/70">
                Confirm this matches your name on LOBB exactly. Mismatches will block your payout setup.
              </p>
            </div>
          )}

          {/* Summary card */}
          {selectedBank && /^\d{10}$/.test(accountNumber) && (
            <div className="rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] p-4 space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">Personal bank account</p>
                <p className="mt-1.5 text-[15px] font-black text-[var(--lobb-text-primary)]">{selectedBank.name}</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-[var(--lobb-text-secondary)]">{accountNumber}</p>
              </div>
              <div className="border-t border-[var(--lobb-border)] pt-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-clay)]">LOBB earnings account</p>
                <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
                  A dedicated account in your name will be created when your profile is approved.
                  Session payouts go there — withdraw anytime.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 pb-10">
          {error && <p className="mb-4 text-[13px] font-semibold text-[var(--lobb-error)]">{error}</p>}
          <OnboardingButton type="submit" disabled={!canContinue || saving}>
            {saving ? "Saving..." : "Save & submit profile"}
          </OnboardingButton>
        </div>
      </form>
    </OnboardingShell>
  );
}
