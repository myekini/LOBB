"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2, User } from "lucide-react";
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
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setName(data?.full_name ?? "");
      setEmail(data?.email ?? "");
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
    const normalizedEmail = email.trim().toLowerCase();
    if (!userId || !name.trim() || !normalizedEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showLobbToast({ type: "error", message: "Enter a valid email address." });
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      let finalAvatarUrl = avatarUrl;

      if (photoFile) {
        finalAvatarUrl = await uploadProfilePhoto(supabase, userId, photoFile, "player-avatar");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim(), email: normalizedEmail, avatar_url: finalAvatarUrl })
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
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <Link
            href="/profile"
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-black">Edit Profile</h1>
        </header>

        {!loading && (
          <>
            <div className="flex flex-col items-center rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-6">
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
                className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 font-semibold outline-none focus:border-[var(--lobb-black)]"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-black">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-14 w-full rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 font-semibold outline-none focus:border-[var(--lobb-black)]"
              />
            </label>

            <button
              onClick={save}
              disabled={saving || !name.trim() || !email.trim()}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
