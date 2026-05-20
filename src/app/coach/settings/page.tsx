import { redirect } from "next/navigation";
import Link from "next/link";
import type React from "react";
import { Bell, Landmark, Shield, Smartphone } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { CoachLogoutButton } from "@/components/coach-logout-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CoachFlowHeader } from "@/components/coach-flow-header";

function maskedAccount(account: string | null | undefined) {
  if (!account) return "Not connected";
  return `**** ${account.slice(-4)}`;
}

export default async function CoachSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const [profileResult, coachResult] = await Promise.all([
    admin.from("profiles").select("phone_number, email, role").eq("id", user.id).maybeSingle(),
    admin
      .from("coaches")
      .select("bank_name, bank_account_number, bank_code, paystack_subaccount_code, status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.data?.role !== "coach") redirect("/");
  if (!coachResult.data) redirect("/auth/setup/coach/1");

  const profile = profileResult.data;
  const coach = coachResult.data;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Settings" eyebrow="Coach account" />
      <section className="mx-auto max-w-md pt-5">
        <section className="space-y-3">
          <SettingRow
            icon={<Smartphone className="size-5 text-[var(--lobb-clay)]" />}
            title="Phone number"
            detail={profile?.phone_number ?? "Not set"}
          />
          <SettingRow
            icon={<Landmark className="size-5 text-[var(--lobb-clay)]" />}
            title={coach.bank_name ?? "Bank account"}
            detail={maskedAccount(coach.bank_account_number)}
            href="/coach/profile/edit#bank"
            action="Edit"
          />
          <SettingRow
            icon={<Bell className="size-5 text-[var(--lobb-clay)]" />}
            title="Notifications"
            detail="Booking, review, and payout alerts are sent by SMS."
          />
          <SettingRow
            icon={<Shield className="size-5 text-[var(--lobb-clay)]" />}
            title="Account status"
            detail={coach.status.replace("_", " ")}
          />
        </section>

        <section className="mt-8 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
          <p className="font-black">Session</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
            Use this when testing multiple coach or player accounts on the same device.
          </p>
          <div className="mt-4">
            <CoachLogoutButton />
          </div>
        </section>
      </section>

      <CoachBottomNav active="profile" />
    </main>
  );
}

function SettingRow({
  icon,
  title,
  detail,
  href,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href?: string;
  action?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-white">{icon}</div>
        <div className="min-w-0">
          <p className="truncate font-black capitalize">{title}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--lobb-muted)]">{detail}</p>
        </div>
      </div>
      {action && <span className="shrink-0 text-xs font-black text-[var(--lobb-clay)]">{action}</span>}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
