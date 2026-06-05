"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, BellOff, Camera, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadProfilePhoto } from "@/lib/supabase/uploads";
import { showLobbToast } from "@/providers/lobb-global-state";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function EditProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url, email_notifications_enabled")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.full_name ?? "");
      setEmail(data?.email ?? "");
      setEmailNotifications(data?.email_notifications_enabled ?? true);
      setAvatarUrl(data?.avatar_url ?? null);
      setLoading(false);
    });
  }, [router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!userId || !name.trim()) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showLobbToast({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      let finalAvatarUrl = avatarUrl;

      if (photoFile) {
        finalAvatarUrl = await uploadProfilePhoto(supabase, userId, photoFile, "player-avatar", "user-media");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          email: normalizedEmail || null,
          avatar_url: finalAvatarUrl,
          email_notifications_enabled: emailNotifications,
        })
        .eq("id", userId);

      if (error) throw error;

      showLobbToast({ type: "success", message: "Profile saved." });
      router.push("/profile");
    } catch (err) {
      showLobbToast({ type: "error", message: err instanceof Error ? err.message : "Could not save profile." });
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = photoPreview ?? avatarUrl;
  const abbr = name ? initials(name) : null;

  return (
    <main className="lobb-app-page min-h-screen px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <Link
            href="/profile"
            className="flex size-10 items-center justify-center border border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-black">Edit Profile</h1>
        </header>

        {!loading && (
          <>
            <div className="lobb-app-card flex flex-col items-center border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-6">
              <div className="relative size-24 overflow-hidden rounded-full bg-[var(--lobb-black)]">
                {displayPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayPhoto} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-2xl font-black text-white">
                    {abbr ?? <User className="size-8 text-white/60" />}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--lobb-clay)]"
              >
                <Camera className="size-4" />
                Change photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-black">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-14 w-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 font-semibold outline-none transition focus:border-[var(--lobb-clay)]"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-black">Email</span>
              <span className="ml-2 text-xs font-semibold text-[var(--lobb-muted)]">(optional)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-14 w-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 font-semibold outline-none transition placeholder:text-[#b4ad9e] focus:border-[var(--lobb-clay)]"
              />
              <p className="mt-1.5 text-xs font-semibold text-[var(--lobb-muted)] leading-relaxed">
                Used for booking confirmations, 24-hour reminders, and session reviews.
              </p>
            </label>

            {email.trim() && (
              <button
                type="button"
                onClick={() => setEmailNotifications((v) => !v)}
                className={`mt-4 flex w-full items-center justify-between border p-4 transition-colors ${
                  emailNotifications
                    ? "border-[var(--lobb-clay)]/20 bg-[var(--lobb-clay)]/[0.03]"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {emailNotifications ? (
                    <Bell className="size-5 text-[var(--lobb-clay)]" />
                  ) : (
                    <BellOff className="size-5 text-[var(--lobb-muted)]" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-black">Email notifications</p>
                    <p className="text-xs font-semibold text-[var(--lobb-muted)]">
                      {emailNotifications ? "Booking updates sent to your email" : "Email notifications are off"}
                    </p>
                  </div>
                </div>
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    emailNotifications ? "bg-[var(--lobb-clay)]" : "bg-[var(--lobb-border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                      emailNotifications ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </button>
            )}

            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 bg-[var(--lobb-clay)] text-sm font-black text-white transition hover:bg-[var(--lobb-clay-dark)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
