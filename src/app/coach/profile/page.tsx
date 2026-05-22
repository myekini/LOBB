import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Eye, Pencil, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import type { CoachRow } from "@/lib/types";
import { SubmitForReviewButton } from "./submit-button";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachKicker, CoachSurface } from "@/components/common/coach-surface";

type Section = {
  label: string;
  detail: string;
  done: boolean;
  href: string;
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
    },
    {
      label: "Headline",
      detail: coach.headline ?? "Not set",
      done: Boolean(coach.headline),
      href: "/coach/profile/edit#headline",
    },
    {
      label: "Bio",
      detail: bio ? (bio.length > 60 ? `${bio.slice(0, 60)}…` : bio) : "Not set",
      done: bio.length >= 50,
      href: "/coach/profile/edit#bio",
    },
    {
      label: "Rate",
      detail:
        hourlyRate >= 1000
          ? `₦${hourlyRate.toLocaleString()}/hr`
          : "Not set",
      done: hourlyRate >= 1000,
      href: "/coach/profile/edit#rate",
    },
    {
      label: "Locations",
      detail: primaryLocation || "Not set",
      done: Boolean(primaryLocation),
      href: "/coach/profile/edit#locations",
    },
    {
      label: "Specializations",
      detail:
        specializations.length > 0
          ? specializations.slice(0, 3).join(", ")
          : "Not set",
      done: specializations.length > 0,
      href: "/coach/profile/edit#specializations",
    },
    {
      label: "Certifications",
      detail:
        certifications.length > 0
          ? certifications[0]
          : "Add your certifications",
      done: certifications.length > 0,
      href: "/coach/profile/edit#certifications",
    },
    {
      label: "Languages",
      detail:
        languages.length > 0 ? languages.join(", ") : "Not set",
      done: languages.length > 0,
      href: "/coach/profile/edit#languages",
    },
    {
      label: "Court Access",
      detail:
        coach.court_access === "coach_has_access"
          ? "Coach has access"
          : coach.court_access === "player_arranges"
          ? "Player arranges court"
          : coach.court_access === "coach_can_recommend"
          ? "Can recommend courts"
          : "Not set",
      done: Boolean(coach.court_access),
      href: "/coach/profile/edit#court-access",
    },
  ];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft — not submitted", color: "#9b958a" },
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
    .single();

  if (error || !coach) redirect("/auth/setup/coach/1");

  const sections = buildSections(coach as CoachRow);
  const doneCount = sections.filter((s) => s.done).length;
  const completionPct = Math.round((doneCount / sections.length) * 100);
  const allDone = doneCount === sections.length;
  const statusInfo = STATUS_LABELS[coach.status] ?? STATUS_LABELS.draft;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-36 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Profile" eyebrow="Coach account" actionHref="/coach/profile/edit" actionLabel="Edit" actionIcon={Pencil} />
      <section className="mx-auto max-w-md pt-5">
        <section className="overflow-hidden rounded-[24px] bg-[var(--lobb-black)] text-white shadow-[0_18px_40px_rgba(13,13,13,0.22)]">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white/10">
                {coach.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.profile_photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="size-7 text-white/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <CoachKicker>{statusInfo.label}</CoachKicker>
                <h1 className="mt-2 truncate text-xl font-black">{coach.full_name || "Coach profile"}</h1>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white/62">
                  {coach.headline || "Add a clear headline so players know what you teach best."}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${completionPct}%`,
                      backgroundColor: completionPct === 100 ? "var(--lobb-success)" : "var(--lobb-clay)",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-black text-white/60">{doneCount}/{sections.length} required sections complete</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-black">{completionPct}%</span>
            </div>
          </div>
        </section>

        {/* Status banner */}
        <section className="mt-5 flex items-start gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4"
          style={{ borderLeftWidth: 4, borderLeftColor: statusInfo.color }}
        >
          <Clock3 className="mt-0.5 size-5 shrink-0" style={{ color: statusInfo.color }} />
          <div>
            <p className="font-black" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </p>
            {coach.status === "pending_review" && (
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Usually takes 24–48 hours. You&apos;ll get an SMS when live.
              </p>
            )}
            {coach.status === "active" && (
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Players can find and book you now.
              </p>
            )}
            {coach.status === "rejected" && (
              <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
                Update your profile and re-submit for review.
              </p>
            )}
          </div>
        </section>

        {/* Sections checklist */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">
            Required Details
          </h2>
          <Link
            href="/coach/profile/preview"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--lobb-clay)]"
          >
            <Eye className="size-3.5" />
            Preview
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/coach/profile/edit"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lobb-black)] text-sm font-black text-white"
          >
            <Pencil className="size-4" />
            Edit profile
          </Link>
          <Link
            href="/coach/settings"
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-sm font-black"
          >
            <Settings className="size-4 text-[var(--lobb-clay)]" />
            Settings
          </Link>
        </div>

        <CoachSurface className="mt-3 overflow-hidden">
          {sections.map((section, index) => (
            <Link
              key={section.label}
              href={section.href}
              className={`flex items-center justify-between gap-3 p-4 transition hover:bg-[var(--lobb-bg)] ${
                index ? "border-t border-[var(--lobb-border)]" : ""
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
                  <p className="truncate text-sm font-black">{section.label}</p>
                  <p
                    className={`mt-1 truncate text-xs font-semibold ${
                      section.done ? "text-[var(--lobb-muted)]" : "text-[var(--lobb-clay)]"
                    }`}
                  >
                    {section.detail}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs font-black text-[var(--lobb-muted)]">
                {section.done ? "Edit" : "Add"}
                <ChevronRight className="size-4" />
              </span>
            </Link>
          ))}
        </CoachSurface>

        {!allDone && (
          <section className="mt-6 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <p className="flex items-center gap-2 font-black">
              <AlertTriangle className="size-4 text-[var(--lobb-clay)]" />
              Complete missing items first
            </p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
              Complete profiles receive more bookings and rank higher in search.
            </p>
          </section>
        )}

        {(coach.status === "draft" || coach.status === "rejected") && allDone && (
          <SubmitForReviewButton />
        )}
      </section>

      <CoachBottomNav active="profile" />
    </main>
  );
}
