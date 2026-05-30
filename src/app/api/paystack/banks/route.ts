import { NextResponse } from "next/server";
import { listBanks } from "@/lib/paystack";

export async function GET() {
  try {
    const banks = await listBanks();
    return NextResponse.json({ banks }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load bank list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
