"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";
import { SkeletonBlock } from "@/components/lobb-skeleton";
import {
  CERTIFICATION_OPTIONS,
  COURT_ACCESS_OPTIONS,
  HOURLY_RATE_OPTIONS,
  LANGUAGE_OPTIONS,
  LAGOS_LOCATIONS,
  SKILL_LEVEL_OPTIONS,
  SPECIALIZATION_OPTIONS,
  type CoachRow,
  type CourtAccess,
} from "@/lib/types";
import { BackLink } from "@/components/back-link";

function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)] scroll-mt-6"
    >
      {title}
    </h2>
  );
}

function MultiChip({
  value,
  selected,
  onClick,
}: {
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-bold transition ${
        selected
          ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white"
          : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
      }`}
    >
      {selected && <CheckCircle2 className="size-3.5" />}
      {value}
    </button>
  );
}

function toggle(value: string, list: string[]): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function CoachProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(10000);
  const [primaryLocation, setPrimaryLocation] = useState("");
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [skillLevels, setSkillLevels] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [courtAccess, setCourtAccess] = useState<CourtAccess>("player_arranges");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const wordCount = bio
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const overWordLimit = wordCount > 300;

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      supabase
        .from("coaches")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data) return;
          const coach = data as CoachRow;
          setFullName(coach.full_name);
          setHeadline(coach.headline ?? "");
          setBio(coach.bio);
          setDemoVideoUrl(coach.demo_video_url ?? "");
          setHourlyRate(coach.hourly_rate_ngn);
          setPrimaryLocation(coach.primary_location);
          setServiceAreas(coach.service_areas);
          setSkillLevels(coach.skill_levels);
          setSpecializations(coach.specializations);
          setCertifications(coach.certifications);
          setLanguages(coach.languages);
          setCourtAccess(coach.court_access as CourtAccess);
          setPhotoUrl(coach.profile_photo_url ?? "");
          setLoading(false);
        });
    });
  }, [router]);

  const save = async () => {
    if (overWordLimit) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError("Session expired. Please log in again.");
      return;
    }

    let finalPhotoUrl = photoUrl;

    try {
      if (photoFile) {
        finalPhotoUrl = await uploadProfilePhoto(supabase, user.id, photoFile, "coach-avatar");
      }

      const res = await fetch("/api/coaches/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          headline,
          bio,
          demo_video_url: demoVideoUrl || null,
          hourly_rate_ngn: hourlyRate,
          primary_location: primaryLocation,
          service_areas: serviceAreas,
          skill_levels: skillLevels,
          specializations,
          certifications,
          languages,
          court_access: courtAccess,
          profile_photo_url: finalPhotoUrl || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Could not save profile.");
      } else {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-36 pt-7">
        <section className="mx-auto max-w-md space-y-5">
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-28 w-full rounded-[20px]" />
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-14 w-full rounded-[18px]" />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-36 pt-7 text-[var(--lobb-black)]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="min-w-0">
            <BackLink href="/coach/profile" label="Profile" className="mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
              Coach Profile
            </p>
            <h1 className="text-[26px] font-black">Edit Profile</h1>
          </div>
          <a
            href="/coach/profile/preview"
            className="text-sm font-bold text-[var(--lobb-muted)]"
          >
            Preview
          </a>
        </div>

        {success && (
          <div className="mb-6 rounded-[18px] border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
            Profile saved successfully.
          </div>
        )}

        <div className="space-y-10">
          {/* ── Photo ───────────────────────────────────────── */}
          <section>
            <SectionHead id="photo" title="Profile Photo" />
            <label className="group relative mx-auto flex w-fit cursor-pointer flex-col items-center">
              <span className="flex size-32 overflow-hidden rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)] transition group-hover:border-[var(--lobb-black)]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="m-auto size-9" />
                )}
              </span>
              <span className="absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full border-4 border-[var(--lobb-bg)] bg-[var(--lobb-black)] text-white">
                <Plus className="size-4" />
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setError("Photo must be under 2 MB.");
                    return;
                  }
                  setPhotoFile(file);
                  setPhotoUrl(URL.createObjectURL(file));
                }}
              />
            </label>
            <p className="mt-3 text-center text-xs font-semibold text-[var(--lobb-muted)]">
              Max 2 MB · JPEG, PNG or WebP
            </p>
          </section>

          {/* ── Name & headline ──────────────────────────────── */}
          <section>
            <SectionHead id="headline" title="Name & Headline" />
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold">Full name *</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold outline-none transition focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold">
                  Headline{" "}
                  <span className="font-semibold text-[var(--lobb-muted)]">(max 150 chars)</span>
                </span>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={150}
                  placeholder="ITF Certified · 8 Years · Lekki & VI"
                  className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
                />
                <span className="mt-1 block text-right text-xs font-bold text-[var(--lobb-muted)]">
                  {headline.length}/150
                </span>
              </label>
            </div>
          </section>

          {/* ── Bio ──────────────────────────────────────────── */}
          <section>
            <SectionHead id="bio" title="Bio" />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={7}
              placeholder="Tell players about your coaching style, experience, and what to expect in a session..."
              className="w-full resize-none rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-3 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
            />
            <span
              className={`mt-1 block text-right text-xs font-bold ${
                overWordLimit ? "text-[#ba1a1a]" : "text-[var(--lobb-muted)]"
              }`}
            >
              {wordCount}/300 words
            </span>
          </section>

          {/* ── Demo video ───────────────────────────────────── */}
          <section>
            <SectionHead id="demo-video" title="Demo Video" />
            <label className="block">
              <span className="text-sm font-bold">YouTube or Instagram URL</span>
              <input
                type="url"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 text-base font-semibold outline-none transition placeholder:font-normal placeholder:text-[#9b958a] focus:border-[var(--lobb-black)] focus:ring-2 focus:ring-black/5"
              />
            </label>
            <p className="mt-2 text-xs font-semibold text-[var(--lobb-muted)]">
              30–60 seconds of coaching footage recommended. Required to go live.
            </p>
          </section>

          {/* ── Rate ─────────────────────────────────────────── */}
          <section>
            <SectionHead id="rate" title="Hourly Rate" />
            <div className="grid grid-cols-3 gap-2">
              {HOURLY_RATE_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setHourlyRate(rate)}
                  className={`h-12 rounded-2xl border text-sm font-black transition ${
                    hourlyRate === rate
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  ₦{(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)}k
                </button>
              ))}
            </div>
          </section>

          {/* ── Locations ────────────────────────────────────── */}
          <section>
            <SectionHead id="rate" title="Locations" />
            <p className="mb-2 text-sm font-bold text-[var(--lobb-black)]">
              Primary location *
            </p>
            <div className="flex flex-wrap gap-2">
              {LAGOS_LOCATIONS.map((loc) => (
                <MultiChip
                  key={loc}
                  value={loc}
                  selected={primaryLocation === loc}
                  onClick={() => setPrimaryLocation(loc)}
                />
              ))}
            </div>
            <p className="mb-2 mt-5 text-sm font-bold text-[var(--lobb-black)]">
              Other areas covered
            </p>
            <div className="flex flex-wrap gap-2">
              {LAGOS_LOCATIONS.filter((l) => l !== primaryLocation).map((loc) => (
                <MultiChip
                  key={loc}
                  value={loc}
                  selected={serviceAreas.includes(loc)}
                  onClick={() => setServiceAreas(toggle(loc, serviceAreas))}
                />
              ))}
            </div>
          </section>

          {/* ── Skill levels ─────────────────────────────────── */}
          <section>
            <SectionHead id="specializations" title="Player Levels" />
            <div className="flex flex-wrap gap-2">
              {SKILL_LEVEL_OPTIONS.map((level) => (
                <MultiChip
                  key={level}
                  value={level}
                  selected={skillLevels.includes(level)}
                  onClick={() => setSkillLevels(toggle(level, skillLevels))}
                />
              ))}
            </div>
          </section>

          {/* ── Specializations ──────────────────────────────── */}
          <section>
            <SectionHead id="specializations" title="Specializations" />
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <MultiChip
                  key={spec}
                  value={spec}
                  selected={specializations.includes(spec)}
                  onClick={() => setSpecializations(toggle(spec, specializations))}
                />
              ))}
            </div>
          </section>

          {/* ── Certifications ───────────────────────────────── */}
          <section>
            <SectionHead id="certifications" title="Certifications" />
            <div className="space-y-2">
              {CERTIFICATION_OPTIONS.map((cert) => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => {
                    if (cert === "No formal certification") {
                      setCertifications((prev) =>
                        prev.includes(cert) ? [] : ["No formal certification"]
                      );
                    } else {
                      setCertifications((prev) =>
                        toggle(cert, prev.filter((c) => c !== "No formal certification"))
                      );
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm font-black transition ${
                    certifications.includes(cert)
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {cert}
                  {certifications.includes(cert) && <CheckCircle2 className="size-5 shrink-0" />}
                </button>
              ))}
            </div>
          </section>

          {/* ── Languages ────────────────────────────────────── */}
          <section>
            <SectionHead id="languages" title="Languages Spoken" />
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <MultiChip
                  key={lang}
                  value={lang}
                  selected={languages.includes(lang)}
                  onClick={() => setLanguages(toggle(lang, languages))}
                />
              ))}
            </div>
          </section>

          {/* ── Court access ─────────────────────────────────── */}
          <section>
            <SectionHead id="court-access" title="Court Access" />
            <div className="space-y-2">
              {COURT_ACCESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCourtAccess(opt.value)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-black transition ${
                    courtAccess === opt.value
                      ? "border-2 border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay)]"
                      : "border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] hover:border-[var(--lobb-black)]"
                  }`}
                >
                  {opt.label}
                  {courtAccess === opt.value && <CheckCircle2 className="size-5 shrink-0" />}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Save button */}
        {error && (
          <p className="mt-6 text-sm font-semibold text-red-700">{error}</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || overWordLimit || !fullName.trim()}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-full bg-[var(--lobb-black)] text-sm font-black text-white shadow-[0_14px_30px_rgba(11,11,10,0.16)] transition hover:bg-black active:scale-[0.98] disabled:pointer-events-none disabled:bg-[#cfc6b8]"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </main>
  );
}
