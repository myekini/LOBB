import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// App-level field encryption for highly sensitive data (NIN, BVN) that must
// never sit in the DB as plain text, even though it's read only by the
// server (Paystack/Smile Identity calls) — never by the browser.
//
// AES-256-GCM, random IV per value. Ciphertext is stored as one string:
//   base64(iv) + "." + base64(authTag) + "." + base64(ciphertext)
//
// Key: KYC_ENCRYPTION_KEY — 32 raw bytes, base64-encoded. Generate with:
//   openssl rand -base64 32
// Must be set in every environment that writes or reads nin_encrypted /
// bvn_encrypted (see docs/SETUP.md). Never commit it. Use a different key
// per environment (staging ≠ prod) so a staging leak can't decrypt prod data.

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM

function getKey(): Buffer {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "KYC_ENCRYPTION_KEY is not set — required to read or write NIN/BVN. See docs/SETUP.md.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("KYC_ENCRYPTION_KEY must decode to exactly 32 bytes (openssl rand -base64 32).");
  }
  return key;
}

/** Encrypt a plaintext string (e.g. an 11-digit NIN or BVN) for storage. */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${ciphertext.toString("base64")}`;
}

/** Decrypt a value produced by encryptField(). Throws if the key or value is wrong. */
export function decryptField(stored: string): string {
  const key = getKey();
  const parts = stored.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted field — expected iv.authTag.ciphertext");
  }
  const [ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** True if KYC_ENCRYPTION_KEY is configured in this environment. */
export function kycEncryptionConfigured(): boolean {
  return Boolean(process.env.KYC_ENCRYPTION_KEY);
}
