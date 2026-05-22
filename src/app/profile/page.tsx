"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, User } from "lucide-react";
import { PlayerBottomNav } from "@/components/layout/player-nav";
import { createClient } from "@/lib/supabase/client";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";

type ProfileData = {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
};

function initials(name: string | null) {
  if (!name) return null;
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    });
  }, [router]);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
  };

  const abbr = initials(profile?.full_name ?? null);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">Profile</h1>

        <div className="mt-7 flex items-center gap-4">
          {loading ? (
            <>
              <SkeletonBlock className="size-20 shrink-0 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </>
          ) : (
            <>
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[var(--lobb-black)]">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-xl font-black text-white">
                    {abbr ?? <User className="size-7 text-white/60" />}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-black">{profile?.full_name ?? "—"}</p>
                {profile?.phone_number && (
                  <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">
                    {profile.phone_number}
                  </p>
                )}
                {profile?.email && (
                  <p className="mt-0.5 text-sm font-semibold text-[var(--lobb-muted)]">
                    {profile.email}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <ProfileSection title="Account">
          <ProfileRow href="/profile/edit" label="Edit profile" />
        </ProfileSection>

        <ProfileSection title="Support">
          <ProfileRow href="/how-it-works" label="How LOBB works" />
          <ProfileRow href="/faq" label="FAQs" />
          <ProfileRow href="/contact" label="Contact support" />
        </ProfileSection>

        <ProfileSection title="Legal">
          <ProfileRow href="/terms" label="Terms of Service" />
          <ProfileRow href="/privacy" label="Privacy Policy" />
        </ProfileSection>

        <div className="mt-8 border-t border-[var(--lobb-border)] pt-6">
          <button onClick={logout} className="text-sm font-black text-[var(--lobb-muted)]">
            Log out
          </button>
        </div>
      </section>

      <PlayerBottomNav active="profile" />
    </main>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">{title}</span>
        <span className="h-px flex-1 bg-[var(--lobb-border)]" />
      </div>
      <div>{children}</div>
    </section>
  );
}

function ProfileRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-[var(--lobb-border)] py-4 text-sm font-black"
    >
      <span>{label}</span>
      <ChevronRight className="size-4 text-[var(--lobb-muted)]" />
    </Link>
  );
}
