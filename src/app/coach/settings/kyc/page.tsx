"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { ConsentCheckbox } from "@/components/ui/consent-checkbox";
import { createClient } from "@/lib/supabase/client";
import { InlineActionLoader, SkeletonBlock } from "@/components/common/lobb-skeleton";

type KycStatus =
  | "pending"
  | "identity_submitted"
  | "identity_verified"
  | "identity_failed"
  | "bvn_pending"
  | "bvn_verified"
  | "bvn_failed";

type KycState = {
  kyc_status: KycStatus;
  kyc_nin_verified: boolean;
  kyc_bvn_verified: boolean;
  kyc_failed_reason: string | null;
  has_nin: boolean;
  has_bvn: boolean;
};

function statusMeta(status: KycStatus) {
  switch (status) {
    case "identity_verified":
    case "bvn_verified":
      return { label: "Verified", color: "var(--lobb-success)", Icon: ShieldCheck, done: true };
    case "identity_submitted":
    case "bvn_pending":
      return { label: "Under review", color: "var(--lobb-clay)", Icon: Clock3, done: false };
    case "identity_failed":
    case "bvn_failed":
      return { label: "Failed", color: "var(--lobb-error)", Icon: ShieldX, done: false };
    default:
      return { label: "Not started", color: "var(--lobb-text-tertiary)", Icon: AlertTriangle, done: false };
  }
}

const isReviewing = (s: KycStatus) =>
  s === "identity_submitted" || s === "bvn_pending";

const isVerified = (s: KycStatus) =>
  s === "identity_verified" || s === "bvn_verified";

const isFailed = (s: KycStatus) =>
  s === "identity_failed" || s === "bvn_failed";

export default function CoachKycPage() {
  const router = useRouter();
  const [kycState, setKycState] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(true);

  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }
      supabase
        .from("coaches")
        .select("kyc_status, kyc_nin_verified, kyc_bvn_verified, kyc_failed_reason, nin, bvn")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setKycState({
              kyc_status: (data.kyc_status as KycStatus) ?? "pending",
              kyc_nin_verified: data.kyc_nin_verified ?? false,
              kyc_bvn_verified: data.kyc_bvn_verified ?? false,
              kyc_failed_reason: data.kyc_failed_reason ?? null,
              has_nin: Boolean(data.nin),
              has_bvn: Boolean(data.bvn),
            });
          }
          setLoading(false);
        });
    });
  }, [router]);

  const canSubmit = /^\d{11}$/.test(nin) && /^\d{11}$/.test(bvn) && consent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/coaches/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin, bvn, identity_consent_accepted: true }),
      });
      const json = await res.json() as { error?: string; kyc_status?: string; message?: string };
      if (!res.ok) throw new Error(json.error ?? "Verification failed. Try again.");

      setSuccess(true);
      setKycState((prev) =>
        prev
          ? {
              ...prev,
              kyc_status: (json.kyc_status as KycStatus) ?? "identity_submitted",
              has_nin: true,
              has_bvn: true,
            }
          : prev
      );
      setNin("");
      setBvn("");
      setConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const meta = kycState ? statusMeta(kycState.kyc_status) : null;
  const StatusIcon = meta?.Icon ?? Clock3;

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader
        title="Identity Verification"
        eyebrow="Coach settings"
        actionHref="/coach/settings"
        actionLabel="Back"
        showLogout={false}
      />

      <div className="mx-auto max-w-lg px-5 pt-6 sm:px-6">

        {/* Status card */}
        {loading ? (
          <SkeletonBlock className="h-24 w-full rounded-[14px]" />
        ) : meta && (
          <div className="lobb-app-card mb-5 flex items-start gap-4 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-[14px]"
              style={{ background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
            >
              <StatusIcon className="size-5" style={{ color: meta.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--lobb-text-tertiary)]">
                KYC status
              </p>
              <p className="mt-1 text-[15px] font-black" style={{ color: meta.color }}>
                {meta.label}
              </p>
              {kycState?.kyc_failed_reason && (
                <p className="mt-1 text-xs font-semibold text-[var(--lobb-error)]">
                  {kycState.kyc_failed_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Verified state */}
        {!loading && kycState && isVerified(kycState.kyc_status) && (
          <div className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-[var(--lobb-success)]" />
            <p className="mt-3 text-lg font-black">Identity verified</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
              Your identity has been confirmed. You can now add your payout bank account.
            </p>
            <button
              onClick={() => router.push("/coach/settings/bank")}
              className="mt-5 inline-flex h-11 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-5 text-sm font-black text-[var(--lobb-text-inverse)]"
            >
              Set up payout bank
            </button>
          </div>
        )}

        {/* Under review state */}
        {!loading && kycState && isReviewing(kycState.kyc_status) && !success && (
          <div className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 text-center">
            <Clock3 className="mx-auto size-10 text-[var(--lobb-clay)]" />
            <p className="mt-3 text-lg font-black">Verification in progress</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
              Your details have been submitted. We&apos;ll notify you once verification is complete — usually within 24 hours.
            </p>
            <p className="mt-4 text-xs font-semibold text-[var(--lobb-text-tertiary)]">
              NIN submitted: {kycState.has_nin ? "Yes" : "No"} · BVN submitted: {kycState.has_bvn ? "Yes" : "No"}
            </p>
          </div>
        )}

        {/* Success banner after submission */}
        {success && (
          <div className="mb-5 rounded-[14px] bg-[var(--lobb-success-soft)] px-4 py-3">
            <p className="text-sm font-black text-[var(--lobb-success)]">Details submitted successfully.</p>
            <p className="mt-0.5 text-xs font-semibold text-[var(--lobb-success)]">
              Verification is in progress. You&apos;ll be notified when complete.
            </p>
          </div>
        )}

        {/* Form — shown for pending or failed states */}
        {!loading && kycState && (!isVerified(kycState.kyc_status) && !isReviewing(kycState.kyc_status)) && (
          <form onSubmit={submit} className="lobb-app-card space-y-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
            <div>
              <h1 className="text-xl font-black tracking-tight">
                {isFailed(kycState.kyc_status) ? "Re-submit identity" : "Verify your identity"}
              </h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--lobb-text-secondary)]">
                Required before you can receive payouts. Your NIN and BVN are encrypted and never shared.
              </p>
            </div>

            {/* NIN */}
            <div>
              <label className="mb-2 block text-sm font-black">
                NIN — National Identification Number <span className="text-[var(--lobb-clay)]">*</span>
              </label>
              <div className="relative flex h-14 items-center overflow-hidden rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-4 transition focus-within:border-[var(--lobb-clay)] focus-within:ring-2 focus-within:ring-[rgba(196,98,45,0.12)]">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="11-digit NIN"
                  className="h-full w-full border-0 bg-transparent text-[15px] font-bold tracking-[0.06em] outline-none placeholder:font-normal placeholder:text-[var(--lobb-text-tertiary)]"
                />
                {/^\d{11}$/.test(nin) && (
                  <CheckCircle2 className="ml-3 size-5 shrink-0 text-[var(--lobb-clay)]" />
                )}
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">
                Find your NIN by dialling *346# on any Nigerian network.
              </p>
            </div>

            {/* BVN */}
            <div>
              <label className="mb-2 block text-sm font-black">
                BVN — Bank Verification Number <span className="text-[var(--lobb-clay)]">*</span>
              </label>
              <div className="relative flex h-14 items-center overflow-hidden rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-4 transition focus-within:border-[var(--lobb-clay)] focus-within:ring-2 focus-within:ring-[rgba(196,98,45,0.12)]">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="11-digit BVN"
                  className="h-full w-full border-0 bg-transparent text-[15px] font-bold tracking-[0.06em] outline-none placeholder:font-normal placeholder:text-[var(--lobb-text-tertiary)]"
                />
                {/^\d{11}$/.test(bvn) && (
                  <CheckCircle2 className="ml-3 size-5 shrink-0 text-[var(--lobb-clay)]" />
                )}
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">
                Find your BVN by dialling *565*0# on any Nigerian network.
              </p>
            </div>

            {/* Consent */}
            <ConsentCheckbox
              checked={consent}
              onChange={setConsent}
              hint="This information is encrypted, stored securely, and used solely for KYC compliance."
            >
              I consent to LOBB verifying my identity using my NIN and BVN through our licensed identity verification provider.
            </ConsentCheckbox>

            {error && (
              <p role="alert" className="rounded-[12px] bg-[var(--lobb-error)]/10 px-3 py-2 text-sm font-semibold text-[var(--lobb-error)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="flex h-14 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.98] disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]"
            >
              {saving ? <InlineActionLoader label="Submitting" /> : "Submit for verification"}
            </button>
          </form>
        )}

        {/* What happens next */}
        {!loading && kycState && !isVerified(kycState.kyc_status) && (
          <div className="mt-4 space-y-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
              What happens next
            </p>
            {[
              "Your NIN is verified against NIMC records.",
              "Your BVN is matched with your bank details when you add your payout account.",
              "Once verified, your LOBB earnings account (DVA) is created automatically.",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--lobb-clay-light)] text-[10px] font-black text-[var(--lobb-clay)]">
                  {i + 1}
                </span>
                <p className="text-xs font-semibold leading-5 text-[var(--lobb-text-secondary)]">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CoachBottomNav active="profile" />
    </main>
  );
}
