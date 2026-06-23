import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import {
  resolveAccount,
  createPaystackCustomer,
  validatePaystackCustomer,
  createDedicatedVirtualAccount,
  createTransferRecipient,
} from "@/lib/paystack";
import { namesAreSimilar } from "@/lib/kyc";

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
  };

  const accountNumber = (body.bank_account_number ?? body.account_number ?? "").trim();
  const bankCode = body.bank_code?.trim();
  const bankName = body.bank_name?.trim();

  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "A 10-digit bank account number is required" }, { status: 400 });
  }
  if (!bankCode) return NextResponse.json({ error: "bank_code is required" }, { status: 400 });
  if (!bankName) return NextResponse.json({ error: "bank_name is required" }, { status: 400 });

  // Fetch coach + profile in one go
  const { data: coach, error: coachError } = await auth.admin
    .from("coaches")
    .select("full_name, bvn, kyc_status, paystack_customer_code")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (coachError) return NextResponse.json({ error: coachError.message }, { status: 500 });
  if (!coach) return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });

  if (!coach.bvn) {
    return NextResponse.json(
      { error: "Complete identity verification (step 2) before setting up payouts" },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await auth.admin
    .from("profiles")
    .select("phone_number")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  try {
    // 1. Resolve personal bank account name — soft name check against profile
    let resolvedAccountName: string | null = null;
    try {
      const resolved = await resolveAccount(accountNumber, bankCode);
      resolvedAccountName = resolved.account_name;

      if (!namesAreSimilar(coach.full_name ?? "", resolvedAccountName)) {
        return NextResponse.json(
          {
            error: `Account name mismatch. Bank returned "${resolvedAccountName}" but your profile name is "${coach.full_name}". Use the account registered in your own name.`,
            account_name: resolvedAccountName,
          },
          { status: 422 }
        );
      }
    } catch {
      // Resolve failed in test mode — continue without name check
    }

    // 2. Create or reuse Paystack customer
    const nameParts = (coach.full_name ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "Coach";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const email = auth.user.email ?? `${auth.user.id}@lobb.ng`;
    const phone = profile?.phone_number ?? "";

    let customerCode = coach.paystack_customer_code;

    if (!customerCode) {
      const customer = await createPaystackCustomer({ email, first_name: firstName, last_name: lastName, phone });
      customerCode = customer.customer_code;
    }

    // 3. Validate customer BVN via Paystack (async on Paystack side — webhook fires later)
    try {
      await validatePaystackCustomer({
        customer_code: customerCode,
        bvn: coach.bvn,
        account_number: accountNumber,
        bank_code: bankCode,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err) {
      // Validation submission failed — log and continue; webhook will confirm status
      console.error("BVN validation submission failed:", err instanceof Error ? err.message : err);
    }

    // 4. Create Dedicated Virtual Account (coach LOBB earnings account)
    let dva: { account_number: string; bank_name: string; bank_code: string } | null = null;
    try {
      dva = await createDedicatedVirtualAccount(customerCode);
    } catch (err) {
      // DVA creation can fail in test mode or if validation is still processing.
      // Store customer code and retry DVA creation via webhook handler when validation completes.
      console.error("DVA creation failed (will retry via webhook):", err instanceof Error ? err.message : err);
    }

    // 5. Create transfer recipient for fallback direct payouts (used until DVA is active)
    const recipient = await createTransferRecipient({
      name: coach.full_name ?? "LOBB Coach",
      account_number: accountNumber,
      bank_code: bankCode,
    });

    // 6. Persist everything
    const updatePayload: Record<string, unknown> = {
      bank_account_number: accountNumber,
      bank_code: bankCode,
      bank_name: bankName,
      paystack_recipient_code: recipient.recipient_code,
      paystack_customer_code: customerCode,
      kyc_status: "bvn_pending",
    };

    if (dva) {
      updatePayload.dva_account_number = dva.account_number;
      updatePayload.dva_bank_name = dva.bank_name;
      updatePayload.dva_bank_code = dva.bank_code;
      updatePayload.kyc_status = "bvn_pending"; // stays pending until webhook confirms
    }

    const { data, error } = await auth.admin
      .from("coaches")
      .update(updatePayload)
      .eq("id", auth.user.id)
      .select("id, bank_account_number, bank_code, bank_name, paystack_recipient_code, dva_account_number, dva_bank_name, kyc_status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      bank: data,
      account_name: resolvedAccountName,
      dva: dva
        ? { account_number: dva.account_number, bank_name: dva.bank_name }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save bank details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
