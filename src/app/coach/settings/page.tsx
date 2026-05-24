import { redirect } from "next/navigation";
import Link from "next/link";
import type React from "react";
import { Bell, Landmark, Mail, Shield, Smartphone } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { CoachLogoutButton } from "@/components/common/coach-logout-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";

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
    admin.from("profiles").select("phone_number, email, email_notifications_enabled, role").eq("id", user.id).maybeSingle(),
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
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Settings" eyebrow="Coach account" active="profile" />
      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <section className="grid gap-3 lg:grid-cols-2">
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
            icon={<Mail className="size-5 text-[var(--lobb-clay)]" />}
            title="Email"
            detail={profile?.email ?? "Not set — add email for booking updates"}
            href="/coach/profile/edit"
            action={profile?.email ? "Edit" : "Add"}
          />
          <SettingRow
            icon={<Bell className="size-5 text-[var(--lobb-clay)]" />}
            title="Notifications"
            detail={
              profile?.email
                ? profile.email_notifications_enabled !== false
                  ? "Email alerts on — booking, earnings, approvals"
                  : "Email alerts are off"
                : "Add an email to receive booking and approval updates"
            }
          />
          <SettingRow
            icon={<Shield className="size-5 text-[var(--lobb-clay)]" />}
            title="Account status"
            detail={coach.status.replace("_", " ")}
          />
        </section>

        <section className="mt-8 rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
          <p className="font-black">Session</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--lobb-text-secondary)]">
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
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 shadow-[var(--lobb-shadow-card)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--lobb-clay-light)]">{icon}</div>
        <div className="min-w-0">
          <p className="truncate font-black capitalize">{title}</p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--lobb-text-secondary)]">{detail}</p>
        </div>
      </div>
      {action && <span className="shrink-0 text-xs font-black text-[var(--lobb-clay)]">{action}</span>}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
