// NIN verification via Dojah (dojah.io). BVN is handled separately, live,
// via Paystack (see /api/coaches/bank + the customeridentification.* webhook
// handler in /api/payments/webhook).

const KYC_PROVIDER_ENABLED = process.env.LOBB_KYC_PROVIDER_ENABLED === "true";
const DOJAH_APP_ID = process.env.DOJAH_APP_ID;
const DOJAH_SECRET_KEY = process.env.DOJAH_SECRET_KEY;

export type NINVerificationResult =
  | { status: "verified"; name: string }
  | { status: "failed"; reason: string }
  | { status: "pending_provider" };

type DojahNinEntity = {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
};

export async function verifyNIN(
  nin: string,
  firstName: string,
  lastName: string
): Promise<NINVerificationResult> {
  if (!KYC_PROVIDER_ENABLED) {
    // Store the NIN, mark as pending provider activation. Flip
    // LOBB_KYC_PROVIDER_ENABLED=true once DOJAH_APP_ID/DOJAH_SECRET_KEY are
    // set for the environment.
    return { status: "pending_provider" };
  }

  if (!DOJAH_APP_ID || !DOJAH_SECRET_KEY) {
    console.error("verifyNIN: LOBB_KYC_PROVIDER_ENABLED is true but DOJAH_APP_ID/DOJAH_SECRET_KEY are not set");
    return { status: "pending_provider" };
  }

  // Dojah keys are prefixed by environment (test_sk_... / live keys don't
  // carry that prefix) — this keeps sandbox vs production pointed at the
  // right host without a third env var to keep in sync.
  const baseUrl = DOJAH_SECRET_KEY.startsWith("test_") ? "https://sandbox.dojah.io" : "https://api.dojah.io";

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/v1/kyc/nin?nin=${encodeURIComponent(nin)}`, {
      headers: { Authorization: DOJAH_SECRET_KEY, AppId: DOJAH_APP_ID },
    });
  } catch (err) {
    console.error("verifyNIN: Dojah request failed:", err instanceof Error ? err.message : err);
    return { status: "failed", reason: "Verification is temporarily unavailable. Please try again shortly." };
  }

  if (res.status === 404 || res.status === 400) {
    const raw = await res.text().catch(() => "");
    console.error(`verifyNIN: Dojah returned ${res.status} for a NIN lookup — raw body:`, raw);
    return {
      status: "failed",
      reason: res.status === 404
        ? "No NIN record found. Check the number and try again."
        : "NIN could not be read. Check the number and try again.",
    };
  }
  if (!res.ok) {
    // 401 (bad credentials), 402 (wallet balance), 424 (Dojah upstream down),
    // 429 (rate limited) — none of these are the coach's fault or something
    // they can fix by retrying their NIN. Keep the user-facing message generic,
    // log the real status for whoever's on call.
    console.error(`verifyNIN: Dojah returned ${res.status} ${res.statusText}`);
    return { status: "failed", reason: "Verification is temporarily unavailable. Please try again shortly." };
  }

  const rawText = await res.text();
  const payload = (() => {
    try {
      return JSON.parse(rawText) as { entity?: DojahNinEntity };
    } catch {
      return null;
    }
  })();
  const entity = payload?.entity;
  if (!entity) {
    console.error("verifyNIN: 200 OK but no `entity` in the response — raw body:", rawText);
    return { status: "failed", reason: "No NIN record found. Check the number and try again." };
  }

  const recordName = [entity.first_name, entity.middle_name, entity.last_name].filter(Boolean).join(" ").trim();
  if (!namesAreSimilar(`${firstName} ${lastName}`, recordName)) {
    console.error(`verifyNIN: name mismatch — profile "${firstName} ${lastName}" vs NIN record "${recordName}"`);
    return { status: "failed", reason: `Name on the NIN record ("${recordName}") does not match your profile name.` };
  }

  return { status: "verified", name: recordName };
}

// Fuzzy name match — handles Nigerian name ordering variations and middle names.
// Returns true if at least 2 tokens overlap (or both are single-token and match).
export function namesAreSimilar(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

  const tokA = new Set(tokenize(a));
  const tokB = tokenize(b);
  const matches = tokB.filter((t) => tokA.has(t)).length;
  return matches >= 2 || (tokA.size === 1 && tokB.length === 1 && matches === 1);
}

// Validate NIN format: exactly 11 digits
export function isValidNIN(nin: string): boolean {
  return /^\d{11}$/.test(nin.trim());
}

// Validate BVN format: exactly 11 digits
export function isValidBVN(bvn: string): boolean {
  return /^\d{11}$/.test(bvn.trim());
}
