import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { resolveAccount } from "@/lib/paystack";

export async function GET(request: Request) {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const accountNumber = searchParams.get("account_number")?.trim() ?? "";
  const bankCode = searchParams.get("bank_code")?.trim() ?? "";

  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "account_number must be 10 digits" }, { status: 400 });
  }
  if (!bankCode) {
    return NextResponse.json({ error: "bank_code is required" }, { status: 400 });
  }

  try {
    const result = await resolveAccount(accountNumber, bankCode);
    return NextResponse.json({ account_name: result.account_name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resolve account";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
