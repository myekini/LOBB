/**
 * LOBB analytics — single entry point for all event tracking.
 *
 * Two platforms:
 *   PostHog — product analytics (funnels, session recordings, retention)
 *   GA4     — web/marketing analytics (acquisition, SEO, traffic sources)
 *
 * Usage:
 *   import { track } from "@/lib/analytics";
 *   track("Booking Confirmed", { booking_id: "...", amount_ngn: 21000, coach_id: "..." });
 */

import posthog from "posthog-js";

// ─── Event registry ───────────────────────────────────────────────────────────
// Every event LOBB fires lives here. Add new events to this map, not inline.

type EventMap = {
  // Auth & onboarding
  "User Signed In":                   { role: string };
  "User Signed Out":                  Record<string, never>;
  "Player Profile Created":           Record<string, never>;
  "Coach Profile Submitted":          Record<string, never>;
  "Coach Onboarding Step Completed":  { step: number };
  "Role Selected":                    { role: string };

  // Discovery
  "Coach Profile Viewed":             { coach_id?: string; coach_name?: string; location?: string; hourly_rate?: number };
  "Search Performed":                 { query: string; location?: string; result_count?: number };
  "Filter Applied":                   { filter_type: string; value: string };

  // Booking funnel — the core conversion path
  "Booking Started":                  { coach_slug?: string | null; coach_name?: string | null; coach_rate?: number | null; slot_iso?: string | null };
  "Payment Initiated":                { coach_slug?: string | null; session_fee?: number | null; lobb_fee?: number | null; total?: number | null; booking_id?: string | null; reference?: string | null };
  "Booking Confirmed":                { booking_id: string; coach_slug?: string | null; coach_name?: string | null; total_paid?: number | null; reference?: string | null };
  "Booking Cancelled":                { booking_id: string; cancelled_by: "player" | "coach"; hours_before_session?: number };
  "Payment Failed":                   { coach_id?: string; error?: string };
};

// ─── Core track function ──────────────────────────────────────────────────────

type Props<K extends keyof EventMap> =
  EventMap[K] extends Record<string, never> ? [] : [properties: EventMap[K]];

export function track<K extends keyof EventMap>(event: K, ...args: Props<K>) {
  if (typeof window === "undefined") return;

  const properties = args[0] as Record<string, unknown> | undefined;

  // PostHog — product analytics
  try {
    posthog.capture(event, properties);
  } catch {
    // SDK not initialised yet — safe to ignore
  }

  // GA4 — forward key conversion events as standard ecommerce events
  // so they show up in GA4's Conversions and Monetisation reports
  try {
    const g = (window as Window & { gtag?: (...a: unknown[]) => void }).gtag;
    if (!g) return;

    if (event === "Booking Confirmed") {
      const p = properties as EventMap["Booking Confirmed"];
      g("event", "purchase", {
        transaction_id: p.booking_id,
        value: p.total_paid,
        currency: "NGN",
        items: [{ item_id: p.coach_slug, item_name: p.coach_name, item_category: "coaching_session" }],
      });
    }

    if (event === "Payment Initiated") {
      const p = properties as EventMap["Payment Initiated"];
      g("event", "begin_checkout", {
        value: p.total,
        currency: "NGN",
      });
    }

    if (event === "Coach Profile Viewed") {
      const p = properties as EventMap["Coach Profile Viewed"];
      g("event", "view_item", {
        items: [{ item_id: p.coach_id, item_name: p.coach_name, item_category: "coach" }],
      });
    }
  } catch {
    // gtag not loaded — safe to ignore
  }
}
