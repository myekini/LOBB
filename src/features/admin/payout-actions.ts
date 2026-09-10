import { showLobbToast } from "@/providers/lobb-global-state";

/**
 * Retry completed sessions whose Paystack transfer to the coach never went out.
 * Shared by the dashboard alert and the earnings page so the toast wording and
 * error handling stay identical. Resolves once the toast has been shown.
 */
export async function retryStuckPayouts() {
  try {
    const res = await fetch("/api/admin/payouts/retry-stuck", { method: "POST" });
    const json = (await res.json()) as { retried?: number; succeeded?: number; failed?: number; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Unable to retry payouts");
    showLobbToast(
      (json.retried ?? 0) === 0
        ? { type: "success", message: "No stuck payouts to retry" }
        : {
            type: json.failed ? "error" : "success",
            message: `${json.succeeded ?? 0} transferred, ${json.failed ?? 0} failed`,
          }
    );
  } catch (error) {
    showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Retry failed. Check server logs." });
  }
}
