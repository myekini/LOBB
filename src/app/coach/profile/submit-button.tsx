"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { showLobbToast } from "@/components/lobb-global-state";

export function SubmitForReviewButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coaches/submit-review", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        showLobbToast({ type: "error", message: json.error ?? "Could not submit profile." });
        return;
      }
      showLobbToast({ type: "success", message: "Profile submitted for review! You'll get an SMS when it's live." });
      router.refresh();
    } catch {
      showLobbToast({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={loading}
      className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)] disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          Submit Profile for Review
          <Send className="size-4" />
        </>
      )}
    </button>
  );
}
