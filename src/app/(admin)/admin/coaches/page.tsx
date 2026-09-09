"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Textarea as LobbTextarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, PlayCircle, UserCheck, X } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/features/admin/admin-shell";
import { money } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { CoachCardSkeleton } from "@/components/common/lobb-skeleton";

type CoachApproval = {
  id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  hourly_rate_ngn: number;
  primary_location: string;
  service_areas: string[];
  certifications: string[];
  demo_video_url: string | null;
  profile_photo_url: string | null;
  bank_connected: boolean;
  slug: string | null;
  created_at: string;
};

function wordCount(text: string | null) {
  return text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
}

function isProperCase(name: string) {
  return name.trim().split(/\s+/).every((part) => part.length > 0 && part[0] === part[0].toUpperCase() && /[a-zA-Z]/.test(part[0]));
}

function qualityChecks(coach: CoachApproval) {
  return [
    { label: "Name capitalised", pass: isProperCase(coach.full_name) },
    { label: "Photo uploaded", pass: Boolean(coach.profile_photo_url) },
    { label: "Headline 20+ chars", pass: (coach.headline?.length ?? 0) >= 20 },
    { label: "Bio 80+ words", pass: wordCount(coach.bio) >= 80 },
    { label: "Rate ₦5k–₦80k", pass: coach.hourly_rate_ngn >= 5_000 && coach.hourly_rate_ngn <= 80_000 },
    { label: "Certification listed", pass: coach.certifications.some((c) => c.trim().length > 3) },
    { label: "Demo video", pass: Boolean(coach.demo_video_url) },
    { label: "Bank connected", pass: coach.bank_connected },
  ];
}

export default function AdminCoachApprovalsPage() {
  const [coaches, setCoaches] = useState<CoachApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<CoachApproval | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCoaches = () => {
    setLoading(true);
    fetchWithCache<{ coaches: CoachApproval[] }>("lobb.admin.coaches.pending", "/api/admin/coaches/pending")
      .then((payload) => {
        setCoaches(payload.coaches ?? []);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load coach approvals" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  const decide = async (coach: CoachApproval, action: "approve" | "reject") => {
    setBusyId(coach.id);
    try {
      const response = await fetch(`/api/admin/coaches/${coach.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? reason : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update coach");
      showLobbToast({ type: "success", message: action === "approve" ? "Coach approved." : "Coach rejected." });
      setRejecting(null);
      setReason("");
      loadCoaches();
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update coach" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell>
      <AdminBackHeader title="Coach Approvals" />
      <div className="mb-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--lobb-clay)]">Review queue</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{coaches.length} pending</h1>
          </div>
          <p className="max-w-md text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
            Approve turns solid green once all 8 launch checks pass. You can still override and approve with gaps &mdash; only do it when you can defend the call.
          </p>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => <CoachCardSkeleton key={index} />)}
          </>
        ) : coaches.length ? coaches.map((coach) => {
          const checks = qualityChecks(coach);
          const failing = checks.filter((c) => !c.pass).length;
          return (
          <article key={coach.id} className="lobb-surface-outlined border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coach.profile_photo_url || "/favicon.svg"} alt="" className="size-20 rounded-[var(--lobb-radius-md)] object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{coach.full_name}</h2>
                <p className="mt-1 text-sm font-medium text-[var(--lobb-text-secondary)]">Submitted: {new Date(coach.created_at).toLocaleDateString("en-NG")}</p>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
                  {coach.headline || "No headline provided"}
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Locations" value={[coach.primary_location, ...coach.service_areas].filter(Boolean).join(", ")} />
              <Info label="Rate" value={`${money(coach.hourly_rate_ngn)}/hr`} />
              <Info label="Certifications" value={coach.certifications.join(", ") || "None"} />
              <Info label="Profile" value={coach.slug ? "Public preview ready" : "Draft link only"} />
            </dl>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">Launch standard</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {checks.map(({ label, pass }) => (
                  <div key={label} className={`flex items-center gap-1.5 rounded-[var(--lobb-radius-sm)] px-2 py-1.5 text-[11px] font-medium ${pass ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]" : "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"}`}>
                    {pass ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={coach.demo_video_url || "#"} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-xs font-medium transition-colors hover:border-[var(--lobb-clay)]/35">
                <PlayCircle className="size-4" />
                Watch video
              </a>
              <Link href={`/coaches/${coach.slug ?? coach.id}`} target="_blank" className="inline-flex h-10 items-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-4 text-xs font-medium transition-colors hover:border-[var(--lobb-clay)]/35">
                View profile
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <LobbButton
                variant="unstyled"
                disabled={busyId === coach.id}
                onClick={() => decide(coach, "approve")}
                className={`flex h-12 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] text-sm font-semibold disabled:opacity-60 ${
                  failing === 0
                    ? "bg-[var(--lobb-success)] text-white"
                    : "border border-[var(--lobb-success)]/45 text-[var(--lobb-success)]"
                }`}
              >
                {busyId === coach.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {busyId === coach.id ? "Working" : failing === 0 ? "Approve" : `Approve anyway (${failing} failing)`}
              </LobbButton>
              <LobbButton variant="unstyled" disabled={busyId === coach.id} onClick={() => setRejecting(coach)} className="flex h-12 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-error)]/35 text-sm font-semibold text-[var(--lobb-error)] disabled:opacity-60">
                <X className="size-4" />
                Reject
              </LobbButton>
            </div>
          </article>
          );
        }) : (
          <div className="border border-dashed border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-8 text-center xl:col-span-2">
            <UserCheck className="mx-auto size-5 text-[var(--lobb-clay)]" />
            <p className="text-lg font-medium">No coaches waiting</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">New coach applications will appear here once they submit their profile for review.</p>
          </div>
        )}
      </section>

      {rejecting && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4 md:items-center" onClick={() => setRejecting(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-coach-title"
            className="mx-auto w-full max-w-md border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reject-coach-title" className="text-lg font-semibold">Reason for rejection</h2>
            <p className="mt-2 text-sm font-medium text-[var(--lobb-text-secondary)]">Tell {rejecting.full_name} what they need to fix.</p>
            <LobbTextarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Headline is too short, add a certification, and re-upload a clearer profile photo."
              className="mt-4 h-28 w-full resize-none rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-medium text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)]"
            />
            <LobbButton variant="unstyled" disabled={!reason.trim() || busyId === rejecting.id} onClick={() => decide(rejecting, "reject")} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-semibold text-[var(--lobb-text-inverse)] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]">
              {busyId === rejecting.id && <Loader2 className="size-4 animate-spin" />}
              {busyId === rejecting.id ? "Sending" : "Send rejection"}
            </LobbButton>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-primary)] p-3">
      <dt className="text-[11px] font-medium text-[var(--lobb-text-tertiary)]">{label}</dt>
      <dd className="mt-1 line-clamp-2 font-medium text-[var(--lobb-text-secondary)]">{value}</dd>
    </div>
  );
}
