import { redirect } from "next/navigation";
import Link from "next/link";
import type React from "react";
import { AlertTriangle, Award, BadgeCheck, CheckCircle2, ChevronRight, Eye, Link2, Pencil, QrCode, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import type { CoachRow } from "@/lib/types";
import { SubmitForReviewButton } from "./submit-button";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachKicker, CoachSurface } from "@/components/common/coach-surface";
import { CoachShareSheet } from "@/features/coaches/coach-share-sheet";
import { CoachProfileCopyLink } from "@/features/coaches/coach-profile-copy-link";

type Section = {
  label: string;
  detail: string;
  done: boolean;
  href: string;
  group: "Identity" | "Coaching details" | "Trust signals";
};

function buildSections(coach: CoachRow): Section[] {
  const bio = coach.bio ?? "";
  const fullName = coach.full_name ?? "";
  const hourlyRate = coach.hourly_rate_ngn ?? 0;
  const primaryLocation = coach.primary_location ?? "";
  const specializations = coach.specializations ?? [];
  const certifications = coach.certifications ?? [];
  const languages = coach.languages ?? [];

  return [
    {
      label: "Photo & Name",
      detail: fullName || "Not set",
      done: Boolean(fullName && coach.profile_photo_url),
      href: "/coach/profile/edit#photo",
      group: "Identity",
    },
    {
      label: "Headline",
      detail: coach.headline ?? "Not set",
      done: Boolean(coach.headline),
      href: "/coach/profile/edit#headline",
      group: "Identity",
    },
    {
      label: "Bio",
      detail: bio ? (bio.length > 60 ? `${bio.slice(0, 60)}…` : bio) : "Not set",
      done: bio.length >= 50,
      href: "/coach/profile/edit#bio",
      group: "Identity",
    },
    {
      label: "Rate",
      detail:
        hourlyRate >= 1000
          ? `₦${hourlyRate.toLocaleString()}/hr`
          : "Not set",
      done: hourlyRate >= 1000,
      href: "/coach/profile/edit#rate",
      group: "Coaching details",
    },
    {
      label: "Locations",
      detail: primaryLocation || "Not set",
      done: Boolean(primaryLocation),
      href: "/coach/profile/edit#locations",
      group: "Coaching details",
    },
    {
      label: "Specializations",
      detail:
        specializations.length > 0
          ? specializations.slice(0, 3).join(", ")
          : "Not set",
      done: specializations.length > 0,
      href: "/coach/profile/edit#specializations",
      group: "Coaching details",
    },
    {
      label: "Certifications",
      detail:
        certifications.length > 0
          ? certifications[0]
          : "Add your certifications",
      done: certifications.length > 0,
      href: "/coach/profile/edit#certifications",
      group: "Trust signals",
    },
    {
      label: "Languages",
      detail:
        languages.length > 0 ? languages.join(", ") : "Not set",
      done: languages.length > 0,
      href: "/coach/profile/edit#languages",
      group: "Trust signals",
    },
    {
      label: "Court Access",
      detail: (() => {
        const courts = coach.courts_worked_with ?? [];
        if (courts.length > 0) return `${courts.length} court${courts.length > 1 ? "s" : ""} listed`;
        if (coach.court_access === "coach_has_access") return "Coach has access";
        if (coach.court_access === "player_arranges") return "Player arranges court";
        if (coach.court_access === "coach_can_recommend") return "Can recommend courts";
        return "Not set";
      })(),
      done: Boolean(coach.court_access) || (coach.courts_worked_with ?? []).length > 0,
      href: "/coach/profile/edit#court-access",
      group: "Trust signals",
    },
  ];
}

const SECTION_GROUPS: Section["group"][] = ["Identity", "Coaching details", "Trust signals"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft, not submitted", color: "#9b958a" },
  pending_review: { label: "Under review", color: "#F4A228" },
  active: { label: "Live on LOBB", color: "var(--lobb-success)" },
  paused: { label: "Paused", color: "#9b958a" },
  suspended: { label: "Suspended", color: "#ba1a1a" },
  rejected: { label: "Profile rejected", color: "#ba1a1a" },
};

export default async function CoachProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: coach, error } = await supabase
    .from("coaches")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !coach) redirect("/auth/setup/coach/1");

  const sections = buildSections(coach as CoachRow);
  const doneCount = sections.filter((s) => s.done).length;
  const completionPct = Math.round((doneCount / sections.length) * 100);
  const allDone = doneCount === sections.length;
  const statusInfo = STATUS_LABELS[coach.status] ?? STATUS_LABELS.draft;
  const certifications: string[] = Array.isArray(coach.certifications)
    ? (coach.certifications as unknown[]).filter((cert: unknown): cert is string => typeof cert === "string" && cert.length > 0)
    : [];
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const publicPath = coach.slug ? `/coaches/${coach.slug}` : "/coach/profile/preview";
  const publicUrl = `${appUrl}${publicPath}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(publicUrl)}`;
  const canShare = Boolean(coach.slug);

  return (
    <main className="lobb-app-page min-h-screen px-5 pb-36 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Profile" eyebrow="Coach account" active="profile" actionHref="/coach/profile/edit" actionLabel="Edit" actionIcon="pencil" />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4">
        <section className="lobb-app-card overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--lobb-bg-secondary)] ring-1 ring-[var(--lobb-border-subtle)]">
                {coach.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.profile_photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="size-6 text-[var(--lobb-text-tertiary)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <CoachKicker>{statusInfo.label}</CoachKicker>
                <h1 className="mt-2 text-xl font-black leading-tight">{coach.full_name || "Coach profile"}</h1>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--lobb-text-secondary)]">
                  {coach.headline || "Add a clear headline so players know what you teach best."}
                </p>
              </div>
            </div>
            <div className="mt-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-[var(--lobb-text-secondary)]">Profile completion</p>
                <span className="text-sm font-black">{completionPct}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--lobb-bg-secondary)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${completionPct}%`,
                    backgroundColor: completionPct === 100 ? "var(--lobb-success)" : "var(--lobb-clay)",
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] font-black text-[var(--lobb-text-tertiary)]">{doneCount}/{sections.length} sections complete</p>
            </div>
            <div className="mt-4 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4">
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusInfo.color }} />
                <div>
                  <p className="text-sm font-black" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--lobb-text-secondary)]">
                    {coach.status === "pending_review"
                      ? "Usually takes 24-48 hours. You will be notified when live."
                      : coach.status === "active"
                      ? "Players can find and book you now."
                      : coach.status === "rejected"
                      ? "Update your profile and re-submit for review."
                      : "Complete your details before submitting for review."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CoachKicker>Public profile</CoachKicker>
              <h2 className="mt-1 text-base font-black">Profile QR</h2>
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-text-secondary)]">
                {canShare ? "Use this QR or link anywhere players find you." : "Set a public slug before sharing your profile."}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
              <QrCode className="size-5" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[112px_minmax(0,1fr)] gap-3">
            <div className="rounded-[12px] border border-[var(--lobb-border-subtle)] bg-white p-2" data-keep-light>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR code for coach public profile" className="size-24 rounded-[8px] bg-white" data-keep-light />
            </div>
            <div className="min-w-0">
              <div className="rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-3 py-2">
                <div className="flex items-center gap-2 text-[var(--lobb-text-secondary)]">
                  <Link2 className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
                  <p className="truncate text-xs font-bold">{publicUrl}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/coach/profile/preview"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-xs font-black text-[var(--lobb-text-primary)]"
                >
                  <Eye className="size-3.5 text-[var(--lobb-clay)]" />
                  Preview
                </Link>
                <CoachProfileCopyLink disabled={!canShare} profileUrl={publicUrl} />
              </div>
              <div className="mt-2">
                <CoachShareSheet
                  coachName={coach.full_name || "Coach"}
                  disabled={!canShare}
                  profileUrl={publicUrl}
                  triggerLabel="Share"
                  triggerClassName="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-xs font-black text-[var(--lobb-text-inverse)] disabled:opacity-45"
                />
              </div>
            </div>
          </div>
        </section>

        {certifications.length > 0 ? (
          <section className="lobb-app-card border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CoachKicker>Public badges</CoachKicker>
                <h2 className="mt-1 text-base font-black">Certifications</h2>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                <Award className="size-5" />
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {certifications.map((cert) => (
                <span
                  key={cert}
                  className="relative inline-flex min-h-[70px] overflow-hidden rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-3 text-[12px] font-black leading-tight text-[var(--lobb-text-primary)] shadow-sm"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--lobb-clay),var(--lobb-star))]" />
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                      <BadgeCheck className="size-4" />
                    </span>
                    <span>
                      <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">Badge</span>
                      <span className="mt-1 block">{cert}</span>
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </section>
        ) : (
          <Link
            href="/coach/profile/edit#certifications"
            className="lobb-app-panel flex items-center justify-between gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                <Award className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-black">Add certifications</span>
                <span className="mt-0.5 block text-xs font-semibold text-[var(--lobb-text-secondary)]">Show credential badges on your public profile.</span>
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/coach/profile/edit"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-xs font-black text-[var(--lobb-text-inverse)]"
          >
            <Pencil className="size-4" />
            Edit
          </Link>
          <Link
            href="/coach/settings"
            className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-xs font-black"
          >
            <Settings className="size-4 text-[var(--lobb-clay)]" />
            Settings
          </Link>
        </div>
          </aside>

          <section className="min-w-0">
        {/* Sections checklist */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
            Required details
          </h2>
          <Link
            href="/coach/profile/preview"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--lobb-clay)]"
          >
            <Eye className="size-3.5" />
            Player preview
          </Link>
        </div>

        <div className="mt-3 space-y-4">
          {SECTION_GROUPS.map((group) => {
            const groupSections = sections.filter((section) => section.group === group);
            const groupDone = groupSections.filter((section) => section.done).length;
            return (
              <CoachSurface key={group} className="overflow-hidden bg-[var(--lobb-bg-elevated)]">
                <div className="flex items-center justify-between border-b border-[var(--lobb-border-subtle)] px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-black">{group}</h3>
                  <span className="text-xs font-black text-[var(--lobb-text-tertiary)]">{groupDone}/{groupSections.length}</span>
                </div>
                {groupSections.map((section, index) => (
                  <Link
                    key={section.label}
                    href={section.href}
                    className={`flex min-h-[72px] items-center justify-between gap-4 p-4 transition hover:bg-[var(--lobb-bg-primary)] sm:px-5 ${
                      index ? "border-t border-[var(--lobb-border-subtle)]" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {section.done ? (
                        <CheckCircle2 className="size-5 shrink-0 fill-[#e8f4ed] text-[var(--lobb-success)]" />
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center">
                          <span className="size-3 rounded-full bg-[var(--lobb-clay)]" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-tight">{section.label}</p>
                        <p
                          className={`mt-1 line-clamp-2 text-xs font-semibold leading-5 ${
                            section.done ? "text-[var(--lobb-text-secondary)]" : "text-[var(--lobb-clay)]"
                          }`}
                        >
                          {section.detail}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-black text-[var(--lobb-text-tertiary)]">
                      {section.done ? "Edit" : "Add"}
                      <ChevronRight className="size-4" />
                    </span>
                  </Link>
                ))}
              </CoachSurface>
            );
          })}
        </div>

        {!allDone && (
          <section className="lobb-app-panel mt-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
            <p className="flex items-center gap-2 font-black">
              <AlertTriangle className="size-4 text-[var(--lobb-clay)]" />
              Complete missing items first
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--lobb-text-secondary)]">
              Complete profiles receive more bookings and rank higher in search.
            </p>
          </section>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <CoachQuickAction href="/coach/profile/edit" icon={<Pencil className="size-4" />} label="Edit profile" />
          <CoachQuickAction href="/coach/profile/preview" icon={<Eye className="size-4" />} label="Preview as player" />
          <CoachQuickAction href="/coach/settings" icon={<Settings className="size-4" />} label="Profile settings" />
        </section>

        {(coach.status === "draft" || coach.status === "rejected") && allDone && (
          <SubmitForReviewButton />
        )}
          </section>
        </div>
      </section>

      <CoachBottomNav active="profile" />
    </main>
  );
}

function CoachQuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="lobb-app-panel flex min-h-[76px] items-center justify-between gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 transition hover:border-[var(--lobb-clay)]/35"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
          {icon}
        </span>
        <span className="text-sm font-black">{label}</span>
      </span>
      <ChevronRight className="size-4 text-[var(--lobb-text-tertiary)]" />
    </Link>
  );
}
