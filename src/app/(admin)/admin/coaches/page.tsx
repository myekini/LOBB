"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Textarea as LobbTextarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, PlayCircle, UserCheck, X } from "lucide-react";
import { AdminEmptyState, AdminPageHeader, AdminRefreshButton, AdminShell } from "@/features/admin/admin-shell";
import { AppDialog } from "@/components/ui/app-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonCell } from "@/components/common/person-cell";
import { money } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { cn } from "@/lib/utils";
import { CoachCardSkeleton, SkeletonBlock } from "@/components/common/lobb-skeleton";
import { COACH_RATE_CEILING, COACH_RATE_FLOOR, isValidCoachRate } from "@/lib/config/pricing";

const RATE_BAND_LABEL = `Rate ₦${(COACH_RATE_FLOOR / 1000).toLocaleString()}k–₦${(COACH_RATE_CEILING / 1000).toLocaleString()}k`;

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
  kyc_status: string | null;
  kyc_nin_verified: boolean;
  kyc_bvn_verified: boolean;
};

type DirectoryCoach = {
  id: string;
  full_name: string;
  headline: string | null;
  primary_location: string | null;
  hourly_rate_ngn: number | null;
  profile_photo_url: string | null;
  slug: string | null;
  status: string;
  is_verified: boolean;
  kyc_status: string | null;
  rejection_count: number | null;
  created_at: string;
  bank_connected: boolean;
};

type DecisionAction = "approve" | "reject" | "suspend" | "unsuspend";

type Tab = "pending_review" | "active" | "suspended" | "rejected" | "all";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "pending_review", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_TONE: Record<string, string> = {
  active: "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]",
  pending_review: "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]",
  rejected: "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]",
  suspended: "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]",
  paused: "bg-[var(--lobb-warning)]/12 text-[var(--lobb-warning)]",
  draft: "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]",
};

function CoachStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-[var(--lobb-radius-sm)] px-2 py-1 text-[11px] font-medium capitalize",
        STATUS_TONE[status] ?? STATUS_TONE.draft
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function wordCount(text: string | null) {
  return text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
}

function isProperCase(name: string) {
  return name.trim().split(/\s+/).every((part) => part.length > 0 && part[0] === part[0].toUpperCase() && /[a-zA-Z]/.test(part[0]));
}

// Three different questions, deliberately not one flat list:
//  - Identity: is this a real, verified person? (Dojah NIN + Paystack BVN —
//    actual government-backed checks, not something an admin can eyeball)
//  - Profile quality: is the page worth a player's trust? (content heuristics
//    an admin genuinely should eyeball — these don't prove identity, they
//    prove effort)
//  - Payout ready: can LOBB actually pay this coach?
function qualityCheckGroups(coach: CoachApproval) {
  return [
    {
      group: "Identity verification",
      checks: [
        { label: "NIN verified", pass: coach.kyc_nin_verified },
        { label: "BVN verified", pass: coach.kyc_bvn_verified },
      ],
    },
    {
      group: "Profile quality",
      checks: [
        { label: "Name capitalised", pass: isProperCase(coach.full_name) },
        { label: "Photo uploaded", pass: Boolean(coach.profile_photo_url) },
        { label: "Headline 20+ chars", pass: (coach.headline?.length ?? 0) >= 20 },
        { label: "Bio 80+ words", pass: wordCount(coach.bio) >= 80 },
        { label: "Certification listed", pass: coach.certifications.some((c) => c.trim().length > 3) },
        { label: "Demo video", pass: Boolean(coach.demo_video_url) },
      ],
    },
    {
      group: "Payout ready",
      checks: [
        { label: RATE_BAND_LABEL, pass: isValidCoachRate(coach.hourly_rate_ngn) },
        { label: "Bank connected", pass: coach.bank_connected },
      ],
    },
  ];
}

function qualityChecks(coach: CoachApproval) {
  return qualityCheckGroups(coach).flatMap((g) => g.checks);
}

export default function AdminCoachesPage() {
  const [tab, setTab] = useState<Tab>("pending_review");
  const [pending, setPending] = useState<CoachApproval[]>([]);
  const [directory, setDirectory] = useState<DirectoryCoach[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingDir, setLoadingDir] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rejecting, setRejecting] = useState<CoachApproval | null>(null);
  const [reason, setReason] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<DirectoryCoach | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [overrideTarget, setOverrideTarget] = useState<CoachApproval | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(() => {
    setLoadingPending(true);
    setLoadingDir(true);
    fetchWithCache<{ coaches: CoachApproval[] }>("lobb.admin.coaches.pending", "/api/admin/coaches/pending")
      .then((payload) => setPending(payload.coaches ?? []))
      .catch((error) => showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load coach approvals" }))
      .finally(() => setLoadingPending(false));

    fetch("/api/admin/coaches")
      .then((r) => r.json() as Promise<{ coaches?: DirectoryCoach[]; error?: string }>)
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setDirectory(json.coaches ?? []);
      })
      .catch((error) => showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load coaches" }))
      .finally(() => setLoadingDir(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const byStatus = directory.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
    return {
      pending_review: byStatus.pending_review ?? pending.length,
      active: byStatus.active ?? 0,
      suspended: byStatus.suspended ?? 0,
      rejected: byStatus.rejected ?? 0,
      all: directory.length,
    } as Record<Tab, number>;
  }, [directory, pending.length]);

  const tableRows = useMemo(() => {
    if (tab === "pending_review") return [];
    return tab === "all" ? directory : directory.filter((c) => c.status === tab);
  }, [directory, tab]);

  const postDecision = async (id: string, action: DecisionAction, actionReason?: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/coaches/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: actionReason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update coach");
      showLobbToast({
        type: "success",
        message:
          action === "approve"
            ? "Coach approved."
            : action === "reject"
              ? "Coach rejected."
              : action === "suspend"
                ? "Coach suspended."
                : "Coach reactivated.",
      });
      setRejecting(null);
      setReason("");
      setSuspendTarget(null);
      setSuspendReason("");
      setOverrideTarget(null);
      setOverrideReason("");
      load();
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update coach" });
    } finally {
      setBusyId(null);
    }
  };

  const showPendingCards = tab === "pending_review";
  const loading = showPendingCards ? loadingPending : loadingDir;

  return (
    <AdminShell>
      <AdminPageHeader eyebrow="Directory" title="Coaches" backHref="/admin">
        <AdminRefreshButton onClick={load} busy={loadingPending || loadingDir} />
      </AdminPageHeader>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <LobbButton
            key={item.value}
            variant="unstyled"
            onClick={() => setTab(item.value)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--lobb-radius-md)] px-4 text-sm font-semibold",
              tab === item.value
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                : "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)]"
            )}
          >
            {item.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] font-bold",
                tab === item.value ? "bg-[var(--lobb-border-inverse)]" : "bg-[var(--lobb-bg-secondary)]"
              )}
            >
              {counts[item.value] ?? 0}
            </span>
          </LobbButton>
        ))}
      </div>

      {showPendingCards ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <CoachCardSkeleton key={index} />)
          ) : pending.length ? (
            pending.map((coach) => {
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

                  <div className="mt-5 space-y-4">
                    {qualityCheckGroups(coach).map(({ group, checks: groupChecks }) => (
                      <div key={group}>
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">{group}</p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {groupChecks.map(({ label, pass }) => (
                            <div key={label} className={`flex items-center gap-1.5 rounded-[var(--lobb-radius-sm)] px-2 py-1.5 text-[11px] font-medium ${pass ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]" : "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"}`}>
                              {pass ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
                      onClick={() => failing === 0 ? postDecision(coach.id, "approve") : setOverrideTarget(coach)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] text-sm font-semibold disabled:opacity-60 ${
                        failing === 0
                          ? "bg-[var(--lobb-success)] text-white"
                          : "border border-[var(--lobb-success)]/45 text-[var(--lobb-success)]"
                      }`}
                    >
                      {busyId === coach.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {busyId === coach.id ? "Approving…" : failing === 0 ? "Approve" : `Review override (${failing})`}
                    </LobbButton>
                    <LobbButton variant="unstyled" disabled={busyId === coach.id} onClick={() => setRejecting(coach)} className="flex h-12 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-error)]/35 text-sm font-semibold text-[var(--lobb-error)] disabled:opacity-60">
                      <X className="size-4" />
                      Reject
                    </LobbButton>
                  </div>
                </article>
              );
            })
          ) : (
            <AdminEmptyState
              icon={UserCheck}
              title="No coaches waiting"
              body="New coach applications will appear here once they submit their profile for review."
              className="xl:col-span-2"
            />
          )}
        </section>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14 rounded-[var(--lobb-radius-md)]" />
          ))}
        </div>
      ) : tableRows.length === 0 ? (
        <AdminEmptyState icon={UserCheck} title="No coaches here" body="Nothing matches this filter yet." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coach</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((coach) => (
              <TableRow key={coach.id}>
                <TableCell>
                  <PersonCell
                    name={coach.full_name}
                    imageUrl={coach.profile_photo_url}
                    secondary={coach.headline || coach.primary_location || "—"}
                  />
                </TableCell>
                <TableCell><CoachStatusBadge status={coach.status} /></TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  {coach.hourly_rate_ngn ? `${money(coach.hourly_rate_ngn)}/hr` : "—"}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {coach.is_verified ? <Check className="size-4 text-[var(--lobb-success)]" strokeWidth={3} /> : <span className="text-[var(--lobb-text-tertiary)]">—</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs font-medium text-[var(--lobb-text-secondary)]">
                  {new Date(coach.created_at).toLocaleDateString("en-NG")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/coaches/${coach.slug ?? coach.id}`}
                      target="_blank"
                      className="inline-flex h-9 items-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] px-3 text-xs font-medium transition-colors hover:border-[var(--lobb-clay)]/35"
                    >
                      View
                    </Link>
                    {coach.status === "active" && (
                      <LobbButton
                        variant="unstyled"
                        disabled={busyId === coach.id}
                        onClick={() => { setSuspendTarget(coach); setSuspendReason(""); }}
                        className="inline-flex h-9 items-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-error)]/35 px-3 text-xs font-semibold text-[var(--lobb-error)] disabled:opacity-60"
                      >
                        Suspend
                      </LobbButton>
                    )}
                    {(coach.status === "suspended" || coach.status === "paused") && (
                      <LobbButton
                        variant="unstyled"
                        disabled={busyId === coach.id}
                        onClick={() => postDecision(coach.id, "unsuspend")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-3 text-xs font-semibold text-[var(--lobb-text-inverse)] disabled:opacity-60"
                      >
                        {busyId === coach.id && <Loader2 className="size-3.5 animate-spin" />}
                        Reactivate
                      </LobbButton>
                    )}
                    {coach.status === "rejected" && (
                      <LobbButton
                        variant="unstyled"
                        disabled={busyId === coach.id}
                        onClick={() => postDecision(coach.id, "approve")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-success)]/45 px-3 text-xs font-semibold text-[var(--lobb-success)] disabled:opacity-60"
                      >
                        {busyId === coach.id && <Loader2 className="size-3.5 animate-spin" />}
                        Approve
                      </LobbButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AppDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => { if (!open) { setRejecting(null); setReason(""); } }}
        title="Reason for rejection"
        description={rejecting ? `Tell ${rejecting.full_name} what they need to fix.` : undefined}
        busy={busyId === rejecting?.id}
        tone="danger"
        footer={
          <LobbButton
            variant="unstyled"
            disabled={!reason.trim() || busyId === rejecting?.id}
            onClick={() => rejecting && postDecision(rejecting.id, "reject", reason)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-semibold text-[var(--lobb-text-inverse)] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] sm:w-auto sm:px-6"
          >
            {busyId === rejecting?.id && <Loader2 className="size-4 animate-spin" />}
            {busyId === rejecting?.id ? "Sending" : "Send rejection"}
          </LobbButton>
        }
      >
        <LobbTextarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Headline is too short, add a certification, and re-upload a clearer profile photo."
          className="h-28 w-full resize-none rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-medium text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)]"
        />
      </AppDialog>

      <AppDialog
        open={Boolean(overrideTarget)}
        onOpenChange={(open) => { if (!open) { setOverrideTarget(null); setOverrideReason(""); } }}
        title="Approve with failed checks"
        description={overrideTarget ? `${overrideTarget.full_name} does not meet every launch check. Add a short internal reason before approving.` : undefined}
        footer={
          <LobbButton
            variant="dark"
            disabled={!overrideReason.trim() || busyId === overrideTarget?.id}
            onClick={() => overrideTarget && postDecision(overrideTarget.id, "approve", overrideReason)}
          >
            {busyId === overrideTarget?.id ? "Approving…" : "Approve coach"}
          </LobbButton>
        }
      >
        <LobbTextarea
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          placeholder="Why is this application safe to approve?"
          rows={3}
        />
      </AppDialog>

      <AppDialog
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => { if (!open) { setSuspendTarget(null); setSuspendReason(""); } }}
        title="Suspend this coach"
        description={suspendTarget ? `${suspendTarget.full_name} will be hidden from search and cannot take new bookings.` : undefined}
        busy={busyId === suspendTarget?.id}
        tone="danger"
        footer={
          <LobbButton
            variant="unstyled"
            disabled={!suspendReason.trim() || busyId === suspendTarget?.id}
            onClick={() => suspendTarget && postDecision(suspendTarget.id, "suspend", suspendReason)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-error)] text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {busyId === suspendTarget?.id && <Loader2 className="size-4 animate-spin" />}
            Suspend coach
          </LobbButton>
        }
      >
        <LobbTextarea
          value={suspendReason}
          onChange={(event) => setSuspendReason(event.target.value)}
          placeholder="Why is this coach being suspended? (kept internal)"
          className="h-24 w-full resize-none rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4 text-sm font-medium text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-border-focus)]"
        />
      </AppDialog>
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
