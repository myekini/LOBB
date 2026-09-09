"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Input as LobbInput } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, WalletCards } from "lucide-react";
import Link from "next/link";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { createClient } from "@/lib/supabase/client";
import { InlineActionLoader, SkeletonBlock } from "@/components/common/lobb-skeleton";

type Bank = { name: string; code: string };

type CoachBankData = {
  bank_name: string | null;
  bank_account_number: string | null;
  bvn: string | null;
  dva_account_number: string | null;
  dva_bank_name: string | null;
};

export default function CoachBankSetupPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [coachData, setCoachData] = useState<CoachBankData | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/paystack/banks")
      .then((r) => r.json() as Promise<{ banks?: Bank[]; error?: string }>)
      .then((data) => { if (data.banks) setBanks(data.banks); })
      .catch(() => setError("Unable to load Nigerian banks. Refresh and try again."))
      .finally(() => setLoadingBanks(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("coaches")
        .select("bank_name, bank_account_number, bvn, dva_account_number, dva_bank_name")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setCoachData(data as CoachBankData | null);
          setLoadingCoach(false);
        });
    });
  }, [router]);

  const hasKyc = Boolean(coachData?.bvn);
  const existing = coachData?.bank_account_number
    ? { bankName: coachData.bank_name, lastFour: coachData.bank_account_number.slice(-4) }
    : null;
  const hasDva = Boolean(coachData?.dva_account_number);

  const selectedBank = banks.find((b) => b.code === bankCode);
  const canSave = /^\d{10}$/.test(accountNumber) && Boolean(bankCode);

  const handleBankChange = (code: string) => {
    setBankCode(code);
    setBankName(banks.find((b) => b.code === code)?.name ?? "");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    setSuccess(false);

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
      const json = await res.json() as { bank?: { dva_account_number?: string; dva_bank_name?: string }; dva?: { account_number: string; bank_name: string } | null; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save bank details");
      setSuccess(true);
      setCoachData((prev) => ({
        ...prev!,
        bank_name: bankName,
        bank_account_number: accountNumber,
        dva_account_number: json.bank?.dva_account_number ?? json.dva?.account_number ?? prev?.dva_account_number ?? null,
        dva_bank_name: json.bank?.dva_bank_name ?? json.dva?.bank_name ?? prev?.dva_bank_name ?? null,
      }));
      setAccountNumber("");
      setBankCode("");
      setBankName("");
      setTimeout(() => router.push("/coach/settings"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader
        title="Payout Account"
        eyebrow="Coach settings"
        actionHref="/coach/settings"
        actionLabel="Back"
        showLogout={false}
      />

      <div className="mx-auto max-w-lg px-5 pt-6 sm:px-6">

        {/* KYC gate — shown until BVN is submitted */}
        {!loadingCoach && !hasKyc && (
          <div className="mb-6 flex items-start gap-3 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-warning)]/35 bg-[var(--lobb-warning)]/8 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--lobb-warning)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--lobb-text-primary)]">Identity verification required</p>
              <p className="mt-1 text-xs font-medium leading-5 text-[var(--lobb-text-secondary)]">
                You must submit your NIN and BVN before adding a payout bank. This protects you and your earnings.
              </p>
              <Link
                href="/coach/settings/kyc"
                className="mt-3 inline-flex h-9 items-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-4 text-xs font-medium text-[var(--lobb-text-inverse)]"
              >
                Verify identity first
              </Link>
            </div>
          </div>
        )}

        {/* DVA card — shown once created */}
        {!loadingCoach && hasDva && (
          <div className="mb-6 flex items-start gap-3 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-clay-light)]">
              <WalletCards className="size-4 text-[var(--lobb-clay)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">
                LOBB earnings account (DVA)
              </p>
              <p className="mt-1 text-[15px] font-medium">{coachData?.dva_bank_name ?? "Virtual account"}</p>
              <p className="font-mono text-sm text-[var(--lobb-text-secondary)]">{coachData?.dva_account_number}</p>
              <p className="mt-1 text-[11px] font-medium text-[var(--lobb-text-tertiary)]">
                Players&apos; payments arrive here. LOBB auto-transfers your net earnings to your payout bank below.
              </p>
            </div>
          </div>
        )}

        {loadingCoach && <SkeletonBlock className="mb-6 h-20 w-full rounded-[var(--lobb-radius-lg)]" />}

        {/* Current payout bank */}
        {existing && (
          <div className="lobb-surface-outlined mb-6 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">
              Current payout account
            </p>
            <p className="mt-2 text-[15px] font-medium">{existing.bankName ?? "Bank account"}</p>
            <p className="mt-0.5 font-mono text-sm text-[var(--lobb-text-secondary)]">**** {existing.lastFour}</p>
          </div>
        )}

        <form onSubmit={save} className="lobb-surface-outlined space-y-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{existing ? "Update payout bank" : "Add payout bank"}</h1>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
              {existing ? "Use the account where LOBB should send future payouts." : "Add the account where LOBB should send your session earnings."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Bank *</label>
            <SearchableSelect
              className="h-14 rounded-[var(--lobb-radius-md)]"
              value={bankCode}
              onChange={handleBankChange}
              options={banks.map((bank) => ({ value: bank.code, label: bank.name }))}
              placeholder={loadingBanks ? "Loading banks…" : "Select your bank"}
              searchPlaceholder="Search banks…"
              emptyMessage="No bank matches that search."
              disabled={loadingBanks}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Account number *</label>
            <div className="relative flex h-14 items-center overflow-hidden rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-4 transition focus-within:border-[var(--lobb-clay)] focus-within:ring-2 focus-within:ring-[rgba(196,98,45,0.12)]">
              <LobbInput
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit NUBAN number"
                className="h-full w-full border-0 bg-transparent text-[15px] font-bold tracking-[0.06em] outline-none placeholder:font-normal placeholder:text-[var(--lobb-text-tertiary)]"
              />
              {/^\d{10}$/.test(accountNumber) && (
                <CheckCircle2 className="ml-3 size-5 shrink-0 text-[var(--lobb-clay)]" />
              )}
            </div>
          </div>

          {selectedBank && /^\d{10}$/.test(accountNumber) && (
            <div className="rounded-[var(--lobb-radius-md)] border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay)]/[0.06] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">Will receive payouts at</p>
              <p className="mt-2 text-[15px] font-medium">{selectedBank.name}</p>
              <p className="mt-0.5 font-mono text-sm text-[var(--lobb-text-secondary)]">{accountNumber}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-error)]/10 px-3 py-2 text-sm font-medium text-[var(--lobb-error)]">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-success-soft)] px-3 py-2 text-sm font-medium text-[var(--lobb-success)]">
              Bank account saved.
            </p>
          )}

          <LobbButton variant="unstyled"
            type="submit"
            disabled={!canSave || saving || loadingBanks || !hasKyc}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-medium text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]"
          >
            {saving ? <InlineActionLoader label="Saving" /> : "Save bank account"}
          </LobbButton>
          {!hasKyc && !loadingCoach && (
            <p className="mt-2 text-center text-xs font-medium text-[var(--lobb-text-tertiary)]">
              Complete identity verification above to enable this.
            </p>
          )}
        </form>
      </div>

      <CoachBottomNav active="profile" />
    </main>
  );
}
