import { redirect } from "next/navigation";
import Link from "next/link";
import type React from "react";
import { Bell, ChevronRight, Landmark, Mail, Shield, Smartphone } from "lucide-react";
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
      .select("bank_name, bank_account_number, bank_code, paystack_recipient_code, dva_account_number, status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.data?.role !== "coach") redirect("/");
  if (!coachResult.data) redirect("/auth/setup/coach/1");

  const profile = profileResult.data;
  const coach = coachResult.data;

  const accountStatus = coach.status.replace(/_/g, " ");
  const notificationsDetail = profile?.email
    ? profile.email_notifications_enabled !== false
      ? "Email alerts enabled"
      : "Email alerts off"
    : "Add an email to enable alerts";

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <CoachFlowHeader title="Settings" eyebrow="Coach account" active="profile" />

      <div className="mx-auto max-w-2xl px-5 pt-6 sm:px-6">
        <section className="mb-5 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5">
          <p className="text-xs font-black text-[var(--lobb-clay)]">Coach account</p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Settings</h1>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                Manage login, payout, and notification details.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-[var(--lobb-clay-light)] px-3 py-1.5 text-xs font-black capitalize text-[var(--lobb-clay)]">
              {accountStatus}
            </span>
          </div>
        </section>

        <SettingGroup label="Account">
          <SettingRow
            icon={<Smartphone className="size-[18px]" />}
            label="Phone number"
            value={profile?.phone_number ?? "Not set"}
          />
          <SettingRow
            icon={<Mail className="size-[18px]" />}
            label="Email"
            value={profile?.email ?? "Not set"}
            href="/coach/profile/edit"
          />
          <SettingRow
            icon={<Shield className="size-[18px]" />}
            label="Account status"
            value={accountStatus}
            last
          />
        </SettingGroup>

        <SettingGroup label="Banking">
          <SettingRow
            icon={<Landmark className="size-[18px]" />}
            label={coach.bank_name ?? "Bank account"}
            value={maskedAccount(coach.bank_account_number)}
            href="/coach/settings/bank"
            last
          />
        </SettingGroup>

        <SettingGroup label="Notifications">
          <SettingRow
            icon={<Bell className="size-[18px]" />}
            label="Email notifications"
            value={notificationsDetail}
            last
          />
        </SettingGroup>

        <div className="mt-2">
          <CoachLogoutButton />
        </div>

      </div>

      <CoachBottomNav active="profile" />
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
  icon,
  label,
  value,
  href,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  last?: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-4 px-5 py-4 transition ${href ? "hover:bg-[var(--lobb-bg-secondary)]" : ""} ${
        !last ? "border-b border-[var(--lobb-border-subtle)]" : ""
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-[var(--lobb-text-primary)]">{label}</p>
        <p className="mt-0.5 truncate text-[12px] capitalize text-[var(--lobb-text-tertiary)]">{value}</p>
      </div>
      {href && <ChevronRight className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />}
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
