"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, PlayCircle, X } from "lucide-react";
import { AdminBackHeader, AdminShell } from "@/features/admin/admin-shell";
import { money } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { CoachCardSkeleton } from "@/components/common/lobb-skeleton";

type CoachApproval = {
  id: string;
  full_name: string;
  headline: string | null;
  hourly_rate_ngn: number;
  primary_location: string;
  service_areas: string[];
  certifications: string[];
  demo_video_url: string | null;
  profile_photo_url: string | null;
  slug: string | null;
  created_at: string;
};

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
    <AdminShell active="Coach Approvals">
      <AdminBackHeader title="Coach Approvals" />
      <div className="mb-5 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.03)]">
        <p className="text-2xl font-black">{coaches.length}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">Pending review</p>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, index) => <CoachCardSkeleton key={index} />)}
          </>
        ) : coaches.length ? coaches.map((coach) => (
          <article key={coach.id} className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)]">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coach.profile_photo_url || "/favicon.svg"} alt="" className="size-20 rounded-[18px] object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-black">{coach.full_name}</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">Submitted: {new Date(coach.created_at).toLocaleDateString("en-NG")}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Headline" value={coach.headline || "Not set"} />
              <Info label="Locations" value={[coach.primary_location, ...coach.service_areas].filter(Boolean).join(", ")} />
              <Info label="Rate" value={`${money(coach.hourly_rate_ngn)}/hr`} />
              <Info label="Certifications" value={coach.certifications.join(", ") || "None"} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={coach.demo_video_url || "#"} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--lobb-border)] px-4 text-xs font-black">
                <PlayCircle className="size-4" />
                Watch Video
              </a>
              <Link href={`/coaches/${coach.slug ?? coach.id}`} target="_blank" className="inline-flex h-10 items-center rounded-full border border-[var(--lobb-border)] px-4 text-xs font-black">
                View full profile →
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button disabled={busyId === coach.id} onClick={() => decide(coach, "approve")} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lobb-success)] text-sm font-black text-white disabled:opacity-60">
                {busyId === coach.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {busyId === coach.id ? "Working" : "Approve"}
              </button>
              <button disabled={busyId === coach.id} onClick={() => setRejecting(coach)} className="flex h-12 items-center justify-center gap-2 rounded-full border border-red-300 text-sm font-black text-red-700 disabled:opacity-60">
                <X className="size-4" />
                Reject
              </button>
            </div>
          </article>
        )) : (
          <div className="rounded-[22px] border border-dashed border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center xl:col-span-2">
            <p className="text-lg font-black">No coaches waiting</p>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-[var(--lobb-muted)]">New coach applications will appear here once they submit their profile for review.</p>
          </div>
        )}
      </section>

      {rejecting && (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-4 md:items-center" onClick={() => setRejecting(null)}>
          <section className="mx-auto w-full max-w-md rounded-[24px] bg-[var(--lobb-surface)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.2)]" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-black">Reason for rejection</h2>
            <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">Tell {rejecting.full_name} what they need to fix.</p>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Tell the coach what they need to fix."
              className="mt-4 h-28 w-full resize-none rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-medium text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)]"
            />
            <button disabled={!reason.trim() || busyId === rejecting.id} onClick={() => decide(rejecting, "reject")} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)]">
              {busyId === rejecting.id && <Loader2 className="size-4 animate-spin" />}
              {busyId === rejecting.id ? "Sending" : "Send Rejection"}
            </button>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--lobb-border)] pb-2 last:border-b-0">
      <dt className="font-black">{label}:</dt>
      <dd className="text-right font-semibold text-[var(--lobb-muted)]">{value}</dd>
    </div>
  );
}
