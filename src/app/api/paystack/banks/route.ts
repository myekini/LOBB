import { NextResponse } from "next/server";
import { listBanks } from "@/lib/paystack";
import { bankLogosByCode } from "@/lib/bank-logos";

export async function GET() {
  try {
    const [banks, logos] = await Promise.all([listBanks(), bankLogosByCode()]);
    const withLogos = banks.map((bank) => ({ ...bank, logo: logos.get(bank.code) ?? null }));
    return NextResponse.json({ banks: withLogos }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load bank list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
