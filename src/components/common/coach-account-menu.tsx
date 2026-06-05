"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, MessageSquareText, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { showLobbToast } from "@/providers/lobb-global-state";

type CoachMenuProfile = {
  full_name: string | null;
  profile_photo_url: string | null;
  email: string | null;
};

export function CoachAccountMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<CoachMenuProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [coachResult, profileResult] = await Promise.all([
        supabase.from("coaches").select("full_name, profile_photo_url").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("email").eq("id", user.id).maybeSingle(),
      ]);

      if (!alive) return;
      setProfile({
        full_name: coachResult.data?.full_name ?? null,
        profile_photo_url: coachResult.data?.profile_photo_url ?? null,
        email: profileResult.data?.email ?? user.email ?? null,
      });
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const logout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out");
      window.location.href = "/auth/login";
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not log out" });
      setBusy(false);
    }
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Coach";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open coach account menu"
        className="flex h-10 items-center gap-2 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] py-1 pl-1 pr-2 text-[var(--lobb-text-primary)] shadow-[var(--lobb-shadow-card)] transition hover:border-[var(--lobb-clay)]/40"
      >
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-[11px] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]">
          {profile?.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_photo_url} alt="" className="size-full object-cover" />
          ) : (
            <User className="size-4" />
          )}
        </span>
        <span className="hidden max-w-20 truncate text-xs font-black md:block">{firstName}</span>
        <ChevronDown className="size-3.5 text-[var(--lobb-text-tertiary)]" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-[20px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-2 shadow-[var(--lobb-shadow-modal)]">
          <div className="flex items-center gap-3 border-b border-[var(--lobb-border-subtle)] p-3">
            <span className="flex size-11 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]">
              {profile?.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_photo_url} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{profile?.full_name ?? "Coach profile"}</p>
              <p className="truncate text-[11px] font-semibold text-[var(--lobb-text-secondary)]">{profile?.email ?? "LOBB coach"}</p>
            </div>
          </div>

          <MenuLink href="/coach/profile" icon={<User className="size-4" />} label="Profile" />
          <MenuLink href="/coach/settings" icon={<Settings className="size-4" />} label="Settings" />
          <MenuLink href="/coach/reviews" icon={<MessageSquareText className="size-4" />} label="Reviews" />
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="mt-1 flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-sm font-black text-[var(--lobb-error)] transition hover:bg-[var(--lobb-bg-secondary)] disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {busy ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-11 items-center gap-3 rounded-[14px] px-3 text-sm font-black text-[var(--lobb-text-primary)] transition hover:bg-[var(--lobb-bg-secondary)]"
    >
      <span className="text-[var(--lobb-clay)]">{icon}</span>
      {label}
    </Link>
  );
}
