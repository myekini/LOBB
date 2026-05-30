"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark } from "lucide-react";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { createClient } from "@/lib/supabase/client";

type Bank = { name: string; code: string };

export default function CoachBankSetupPage() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [existing, setExisting] = useState<{ bankName: string | null; lastFour: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/paystack/banks")
      .then((r) => r.json() as Promise<{ banks?: Bank[]; error?: string }>)
      .then((data) => { if (data.banks) setBanks(data.banks); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      supabase.from("coaches")
        .select("bank_name, bank_account_number, paystack_subaccount_code")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.bank_account_number) {
            setExisting({
              bankName: data.bank_name,
              lastFour: data.bank_account_number.slice(-4),
            });
          }
        });
    });
  }, [router]);

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
      const json = await res.json() as { bank?: unknown; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save bank details");
      setSuccess(true);
      setExisting({ bankName: bankName, lastFour: accountNumber.slice(-4) });
      setAccountNumber("");
      setBankCode("");
      setBankName("");
      setTimeout(() => router.push("/coach/settings"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader
        title="Payout Account"
        eyebrow="Coach settings"
        actionHref="/coach/settings"
        actionLabel="Back"
        showLogout={false}
      />

      <div className="mx-auto max-w-lg px-5 pt-6 sm:px-6">
        {existing && (
          <div className="mb-6 rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">
              Current payout account
            </p>
            <p className="mt-2 text-[15px] font-black">{existing.bankName ?? "Bank account"}</p>
            <p className="mt-0.5 font-mono text-sm text-[var(--lobb-text-secondary)]">**** {existing.lastFour}</p>
          </div>
        )}

        <form onSubmit={save} className="space-y-5">
          <p className="text-sm font-semibold text-[var(--lobb-text-secondary)]">
            {existing ? "Update your payout bank account." : "Add your bank account to start accepting bookings."}
          </p>

          {/* Bank selector */}
          <div>
            <label className="mb-2 block text-sm font-black">Bank *</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lobb-clay)] pointer-events-none">
                <Landmark className="size-5" />
              </div>
              <select
                value={bankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                className="h-14 w-full appearance-none rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] pl-12 pr-5 text-[15px] font-bold text-[var(--lobb-text-primary)] outline-none transition focus:border-[var(--lobb-clay)] focus:ring-2 focus:ring-[rgba(196,98,45,0.12)]"
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
            <label className="mb-2 block text-sm font-black">Account number *</label>
            <div className="relative flex h-14 items-center overflow-hidden rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 transition focus-within:border-[var(--lobb-clay)] focus-within:ring-2 focus-within:ring-[rgba(196,98,45,0.12)]">
              <input
                type="text"
                inputMode="numeric"
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

          {/* Summary */}
          {selectedBank && /^\d{10}$/.test(accountNumber) && (
            <div className="rounded-[16px] border border-[var(--lobb-clay)]/30 bg-[var(--lobb-clay)]/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">Will receive payouts at</p>
              <p className="mt-2 text-[15px] font-black">{selectedBank.name}</p>
              <p className="mt-0.5 font-mono text-sm text-[var(--lobb-text-secondary)]">{accountNumber}</p>
            </div>
          )}

          {error && <p className="text-sm font-semibold text-[var(--lobb-error)]">{error}</p>}
          {success && <p className="text-sm font-semibold text-[var(--lobb-success)]">Bank account saved.</p>}

          <button
            type="submit"
            disabled={!canSave || saving}
            className="mt-2 h-14 w-full rounded-[16px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]"
          >
            {saving ? "Saving..." : "Save bank account"}
          </button>
        </form>
      </div>

      <CoachBottomNav active="profile" />
    </main>
  );
}
