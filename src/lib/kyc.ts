// NIN verification stub — replace with Smile Identity or VerifyMe once CAC is complete
// and API credentials are obtained. The rest of the KYC flow (BVN via Paystack) is live.

const KYC_PROVIDER_ENABLED = process.env.LOBB_KYC_PROVIDER_ENABLED === "true";

export type NINVerificationResult =
  | { status: "verified"; name: string }
  | { status: "failed"; reason: string }
  | { status: "pending_provider" };

export async function verifyNIN(
  nin: string,
  firstName: string,
  lastName: string
): Promise<NINVerificationResult> {
  void nin;
  void firstName;
  void lastName;

  if (!KYC_PROVIDER_ENABLED) {
    // Stub: store the NIN, mark as pending provider activation.
    // Once Smile Identity / VerifyMe is wired up, replace this block with the real API call.
    return { status: "pending_provider" };
  }

  // TODO: replace with Smile Identity or VerifyMe API call
  // Example Smile Identity endpoint: POST https://3eydmgh10d.execute-api.us-west-2.amazonaws.com/test/v1/id_verification
  // Body: { id_type: "NIN", id_number: nin, first_name: firstName, last_name: lastName, country: "NG" }
  throw new Error("KYC provider enabled but not yet implemented — wire up Smile Identity or VerifyMe here");
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
