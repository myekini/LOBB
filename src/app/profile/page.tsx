"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  HelpCircle,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Pencil,
  User,
} from "lucide-react";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
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
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader active="profile" title="Profile" />
      <div className="mx-auto max-w-lg px-5 pt-8 sm:px-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 pb-8">
          {loading ? (
            <>
              <SkeletonBlock className="size-16 shrink-0 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </>
          ) : (
            <>
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[var(--lobb-bg-inverse)]">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-lg font-black text-[var(--lobb-text-inverse)]">
                    {abbr ?? <User className="size-6 opacity-60" />}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[17px] font-black">{profile?.full_name ?? "—"}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--lobb-text-secondary)]">
                  {profile?.phone_number ?? profile?.email ?? ""}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Account */}
        <SettingGroup label="Account">
          <SettingRow href="/profile/edit" icon={<Pencil className="size-[18px]" />} label="Edit profile" description="Name, photo, contact info" />
        </SettingGroup>

        {/* Support */}
        <SettingGroup label="Support">
          <SettingRow href="/how-it-works" icon={<HelpCircle className="size-[18px]" />} label="How LOBB works" description="Booking flow and policies" />
          <SettingRow href="/faq" icon={<MessageSquare className="size-[18px]" />} label="FAQs" description="Common questions answered" />
          <SettingRow href="/contact" icon={<Mail className="size-[18px]" />} label="Contact support" description="Get help from our team" last />
        </SettingGroup>

        {/* Legal */}
        <SettingGroup label="Legal">
          <SettingRow href="/terms" icon={<FileText className="size-[18px]" />} label="Terms of Service" />
          <SettingRow href="/privacy" icon={<Lock className="size-[18px]" />} label="Privacy Policy" last />
        </SettingGroup>

        {/* Sign out */}
        <div className="mt-2">
          <button
            onClick={logout}
            className="lobb-app-panel flex w-full items-center justify-between border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-5 py-4 text-sm font-black text-[var(--lobb-text-secondary)] transition hover:text-red-500"
          >
            Sign out
          </button>
        </div>

      </div>
      <PlayerBottomNav active="profile" />
    </main>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--lobb-text-tertiary)]">
        {label}
      </p>
      <div className="lobb-settings-group overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)]">
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  href,
  icon,
  label,
  description,
  last,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--lobb-bg-secondary)] ${
        !last ? "border-b border-[var(--lobb-border-subtle)]" : ""
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-[var(--lobb-text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] text-[var(--lobb-text-tertiary)]">{description}</p>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
    </Link>
  );
}
