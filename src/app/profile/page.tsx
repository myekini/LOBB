"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PlayerBottomNav } from "@/components/player-nav";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">Profile</h1>

        <div className="mt-7 flex items-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-[var(--lobb-black)] text-2xl font-black text-white">
            TA
          </div>
          <div>
            <p className="text-lg font-black">Tunde Adeyemi</p>
            <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">+234 812 345 678</p>
          </div>
        </div>

        <ProfileSection title="Account">
          <ProfileRow href="/profile/edit" label="Edit name / photo" />
        </ProfileSection>

        <ProfileSection title="Support">
          <ProfileRow href="/how-it-works" label="How LOBB works" />
          <ProfileRow href="/faq" label="FAQs" />
          <ProfileRow href="https://wa.me/2348123456789" label="Contact support" external />
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

function ProfileRow({ href, label, external }: { href: string; label: string; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="flex items-center justify-between border-b border-[var(--lobb-border)] py-4 text-sm font-black">
      <span>{label}</span>
      <ChevronRight className="size-4 text-[var(--lobb-muted)]" />
    </Link>
  );
}
