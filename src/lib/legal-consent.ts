import type { SupabaseClient } from "@supabase/supabase-js";

export const LEGAL_DOCUMENT_VERSION = "2026-06";

export const LEGAL_DOCUMENT_NAMES = [
  "terms_of_service",
  "privacy_policy",
  "cancellation_policy",
  "coach_agreement",
  "identity_verification_consent",
  "coach_profile_accuracy",
  "coach_code_of_conduct",
] as const;

export type LegalDocumentName = (typeof LEGAL_DOCUMENT_NAMES)[number];

export function isLegalDocumentName(value: unknown): value is LegalDocumentName {
  return typeof value === "string" && LEGAL_DOCUMENT_NAMES.includes(value as LegalDocumentName);
}

export async function logLegalConsent({
  admin,
  userId,
  documentName,
  ipAddress,
  userAgent,
  metadata = {},
}: {
  admin: SupabaseClient;
  userId: string;
  documentName: LegalDocumentName;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await admin.from("consent_logs").insert({
    user_id: userId,
    document_name: documentName,
    document_version: LEGAL_DOCUMENT_VERSION,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    metadata,
  });

  if (error) throw error;
}
