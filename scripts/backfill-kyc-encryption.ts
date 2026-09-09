/**
 * One-off backfill: encrypt existing plaintext coaches.nin / coaches.bvn into
 * the new nin_encrypted / bvn_encrypted columns (see
 * supabase/migrations/20260909000001_encrypt_kyc_fields.sql).
 *
 * Safe to re-run — skips rows that already have an encrypted value. Does NOT
 * touch or drop the old plaintext columns; that's a separate, later step.
 *
 * Usage:
 *   npx tsx scripts/backfill-kyc-encryption.ts
 *
 * Required env vars (copy from .env.local, or the target environment's env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   KYC_ENCRYPTION_KEY        (must match what the app uses in that environment)
 *
 * Run once per environment (staging, then prod) — each has its own
 * KYC_ENCRYPTION_KEY, so a value encrypted for staging cannot be decrypted
 * with the prod key or vice versa.
 */

import { createClient } from "@supabase/supabase-js";
import { encryptField } from "../src/lib/crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
if (!process.env.KYC_ENCRYPTION_KEY) {
  console.error("❌  KYC_ENCRYPTION_KEY is required — must match the target environment's key.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CoachRow = {
  id: string;
  nin: string | null;
  bvn: string | null;
  nin_encrypted: string | null;
  bvn_encrypted: string | null;
};

async function main() {
  const { data: coaches, error } = await supabase
    .from("coaches")
    .select("id, nin, bvn, nin_encrypted, bvn_encrypted")
    .or("nin.not.is.null,bvn.not.is.null")
    .returns<CoachRow[]>();

  if (error) {
    console.error("❌  Could not read coaches:", error.message);
    process.exit(1);
  }

  console.log(`\nFound ${coaches?.length ?? 0} coach row(s) with a plaintext NIN and/or BVN.\n`);

  let encrypted = 0;
  let skipped = 0;
  let failed = 0;

  for (const coach of coaches ?? []) {
    const update: Record<string, string> = {};

    if (coach.nin && !coach.nin_encrypted) {
      update.nin_encrypted = encryptField(coach.nin);
    }
    if (coach.bvn && !coach.bvn_encrypted) {
      update.bvn_encrypted = encryptField(coach.bvn);
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase.from("coaches").update(update).eq("id", coach.id);

    if (updateError) {
      failed++;
      console.error(`  ✗ ${coach.id} — ${updateError.message}`);
      continue;
    }

    encrypted++;
    console.log(`  ✓ ${coach.id} — encrypted ${Object.keys(update).join(" + ")}`);
  }

  console.log(`\nDone. Encrypted: ${encrypted}  Already done: ${skipped}  Failed: ${failed}\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
