import posthog from "posthog-js";
import mixpanel from "mixpanel-browser";

/**
 * Fire an analytics event to both PostHog and Mixpanel.
 * Safe to call from any client component — silently no-ops on server or if
 * either tool hasn't initialised yet.
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try { posthog.capture(event, properties); } catch { /* not yet initialised */ }
  try { mixpanel.track(event, properties); } catch { /* not yet initialised */ }
}
