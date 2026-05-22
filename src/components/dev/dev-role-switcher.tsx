"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Loader2, Sparkles, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type DevRole = "player" | "coach" | "admin";

export function DevRoleSwitcher() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<DevRole | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState<DevRole | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check if dev login is enabled
    if (process.env.NEXT_PUBLIC_LOBB_DEV_LOGIN === "true") {
      setIsDevMode(true);
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.role) {
              setCurrentRole(data.role as DevRole);
            }
          });
      }
    });
  }, []);

  if (!isDevMode || !currentRole) return null;

  const handleRoleSwitch = async (role: DevRole) => {
    if (role === currentRole || busy) return;
    setBusy(role);
    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json()) as { success?: boolean; redirectUrl?: string; error?: string };

      if (!res.ok || !json.success) {
        alert(json.error ?? "Failed to switch role");
        return;
      }

      // Re-initialize Supabase session by refreshing
      const supabase = createClient();
      await supabase.auth.refreshSession();

      // Navigate to corresponding dashboard
      router.push(json.redirectUrl ?? "/");
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      alert("Network error during role switch");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end md:bottom-6 md:right-6">
      {isOpen && (
        <div className="mb-3 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-2 shadow-[0_12px_42px_rgba(13,13,13,0.18)] backdrop-blur-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
            Dev Quick-Switch
          </p>
          <p className="mb-3 px-3 text-[11px] font-semibold text-[var(--lobb-muted)]">
            Active: <span className="font-bold text-[var(--lobb-black)] capitalize">{currentRole}</span>
          </p>
          <div className="space-y-1">
            {(["player", "coach", "admin"] as const).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                disabled={busy !== null}
                className={cn(
                  "flex h-11 w-full items-center justify-between rounded-xl px-3 text-xs font-black capitalize transition-all active:scale-[0.98]",
                  currentRole === role
                    ? "bg-[var(--lobb-black)] text-white"
                    : "text-[var(--lobb-black)] hover:bg-black/5"
                )}
              >
                <span className="flex items-center gap-2">
                  <User className="size-3.5" />
                  {role}
                </span>
                {busy === role && <Loader2 className="size-3.5 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-[46px] items-center gap-2 rounded-full px-4 text-xs font-black shadow-[0_8px_32px_rgba(196,98,45,0.22)] transition-all active:scale-[0.96]",
          isOpen
            ? "bg-[var(--lobb-black)] text-white"
            : "bg-[var(--lobb-clay)] text-white hover:bg-[var(--lobb-clay-dark)]"
        )}
      >
        <Sparkles className="size-4" />
        <span>Dev: {currentRole}</span>
        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
      </button>
    </div>
  );
}
