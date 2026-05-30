import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { createSubaccount } from "@/lib/paystack";

export async function POST(request: Request) {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    bank_account_number?: string;
    account_number?: string;
    bank_code?: string;
    bank_name?: string;
    business_name?: string;
  };

  const accountNumber = (body.bank_account_number ?? body.account_number ?? "").trim();
  const bankCode = body.bank_code?.trim();
  const bankName = body.bank_name?.trim();

  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "A 10-digit bank account number is required" }, { status: 400 });
  }
  if (!bankCode) return NextResponse.json({ error: "bank_code is required" }, { status: 400 });
  if (!bankName) return NextResponse.json({ error: "bank_name is required" }, { status: 400 });

  try {
    const { data: coach, error: coachError } = await auth.admin
      .from("coaches")
      .select("full_name")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (coachError) return NextResponse.json({ error: coachError.message }, { status: 500 });

    const subaccount = await createSubaccount({
      business_name: body.business_name?.trim() || coach?.full_name || "LOBB Coach",
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 85,
    });

    const { data, error } = await auth.admin
      .from("coaches")
      .update({
        bank_account_number: accountNumber,
        bank_code: bankCode,
        bank_name: bankName,
        paystack_subaccount_code: subaccount.subaccount_code,
      })
      .eq("id", auth.user.id)
      .select("id, bank_account_number, bank_code, bank_name, paystack_subaccount_code")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bank: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save bank details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
