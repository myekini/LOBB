import crypto from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/json",
  };
}

// ─── Initialize ────────────────────────────────────────────────────────────────

export type InitTransactionInput = {
  email: string;
  amount_kobo: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
};

export type InitTransactionResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(
  input: InitTransactionInput
): Promise<InitTransactionResult> {
  const body: Record<string, unknown> = {
    email:        input.email,
    amount:       input.amount_kobo,
    reference:    input.reference,
    callback_url: input.callback_url,
    metadata:     input.metadata ?? {},
  };

  const res  = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  const json = (await res.json()) as { status: boolean; message: string; data: InitTransactionResult };
  if (!json.status) throw new Error(json.message || "Paystack initialization failed");
  return json.data;
}

// ─── Verify ────────────────────────────────────────────────────────────────────

export type PaystackTransactionData = {
  id: number;
  status: string;       // "success" | "failed" | "abandoned"
  reference: string;
  amount: number;       // in kobo
  paid_at: string | null;
  gateway_response: string;
  customer: { email: string };
  subaccount?: { id: string };
};

export async function verifyTransaction(reference: string): Promise<PaystackTransactionData> {
  const res  = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders() }
  );
  const json = (await res.json()) as { status: boolean; message: string; data: PaystackTransactionData };
  if (!json.status) throw new Error(json.message || "Paystack verification failed");
  return json.data;
}

// ─── Refund ────────────────────────────────────────────────────────────────────

export async function initiateRefund(
  transactionReference: string,
  amount_kobo?: number // omit for full refund
): Promise<void> {
  const body: Record<string, unknown> = { transaction: transactionReference };
  if (amount_kobo !== undefined) body.amount = amount_kobo;

  const res  = await fetch(`${PAYSTACK_BASE}/refund`, {
    method:  "POST",
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });
  const json = (await res.json()) as { status: boolean; message: string };
  if (!json.status) throw new Error(json.message || "Paystack refund failed");
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export type PaystackBank = {
  name: string;
  code: string;
};

export async function listBanks(): Promise<PaystackBank[]> {
  const res = await fetch(
    `${PAYSTACK_BASE}/bank?country=nigeria&currency=NGN&use_cursor=false&perPage=100`,
    { headers: authHeaders(), next: { revalidate: 3600 } }
  );
  const json = (await res.json()) as { status: boolean; message: string; data: { name: string; code: string }[] };
  if (!json.status) throw new Error(json.message || "Failed to fetch bank list");
  return json.data.map((b) => ({ name: b.name, code: b.code }));
}

// ─── Subaccounts ──────────────────────────────────────────────────────────────

export type CreateSubaccountInput = {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge?: number;
  description?: string;
};

export type CreateSubaccountResult = {
  subaccount_code: string;
  business_name: string;
  settlement_bank: string;
  account_number: string;
};

export async function createSubaccount(input: CreateSubaccountInput): Promise<CreateSubaccountResult> {
  const res = await fetch(`${PAYSTACK_BASE}/subaccount`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      business_name: input.business_name,
      settlement_bank: input.settlement_bank,
      account_number: input.account_number,
      percentage_charge: input.percentage_charge ?? 85,
      description: input.description ?? "LOBB coach payout subaccount",
    }),
  });
  const json = (await res.json()) as { status: boolean; message: string; data: CreateSubaccountResult };
  if (!json.status) throw new Error(json.message || "Paystack subaccount creation failed");
  return json.data;
}

// ─── Transfer recipients ───────────────────────────────────────────────────────

export type CreateTransferRecipientInput = {
  name: string;
  account_number: string;
  bank_code: string;
  description?: string;
};

export type CreateTransferRecipientResult = {
  recipient_code: string;
};

export async function createTransferRecipient(
  input: CreateTransferRecipientInput
): Promise<CreateTransferRecipientResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.account_number,
      bank_code: input.bank_code,
      currency: "NGN",
      description: input.description ?? "LOBB coach payout recipient",
    }),
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: { recipient_code: string };
  };
  if (!json.status) throw new Error(json.message || "Paystack recipient creation failed");
  return { recipient_code: json.data.recipient_code };
}

// ─── Transfers ─────────────────────────────────────────────────────────────────

export type CreateTransferInput = {
  amount_kobo: number;
  recipient_code: string;
  reference?: string;
  reason?: string;
};

export type CreateTransferResult = {
  transfer_code: string;
  status: string;
};

export async function createTransfer(
  input: CreateTransferInput
): Promise<CreateTransferResult> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      source: "balance",
      amount: input.amount_kobo,
      recipient: input.recipient_code,
      reference: input.reference,
      reason: input.reason ?? "LOBB session payout",
    }),
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: CreateTransferResult;
  };
  if (!json.status) throw new Error(json.message || "Paystack transfer failed");
  return json.data;
}

// ─── Webhook signature ─────────────────────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret =
    process.env.PAYSTACK_WEBHOOK_SECRET ||
    (process.env.NODE_ENV === "production" ? undefined : process.env.PAYSTACK_SECRET_KEY);
  if (!secret) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(hash, "hex");
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

// ─── Resolve bank account ──────────────────────────────────────────────────────

export type ResolveAccountResult = {
  account_name: string;
  account_number: string;
};

export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<ResolveAccountResult> {
  const url = `${PAYSTACK_BASE}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
  const res = await fetch(url, { headers: authHeaders() });
  const json = (await res.json()) as { status: boolean; message: string; data: ResolveAccountResult };
  if (!json.status) throw new Error(json.message || "Could not resolve account name");
  return json.data;
}

// ─── DVA: Customer ─────────────────────────────────────────────────────────────

export type CreateCustomerInput = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export async function createPaystackCustomer(
  input: CreateCustomerInput
): Promise<{ customer_code: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/customer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: { customer_code: string };
  };
  if (!json.status) throw new Error(json.message || "Failed to create Paystack customer");
  return { customer_code: json.data.customer_code };
}

// ─── DVA: Customer validation (BVN) ───────────────────────────────────────────

export type ValidateCustomerInput = {
  customer_code: string;
  bvn: string;
  account_number: string;
  bank_code: string;
  first_name: string;
  last_name: string;
};

export async function validatePaystackCustomer(input: ValidateCustomerInput): Promise<void> {
  const res = await fetch(
    `${PAYSTACK_BASE}/customer/${encodeURIComponent(input.customer_code)}/identification`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        country: "NG",
        type: "bank_account",
        bvn: input.bvn,
        account_number: input.account_number,
        bank_code: input.bank_code,
        first_name: input.first_name,
        last_name: input.last_name,
      }),
    }
  );
  const json = (await res.json()) as { status: boolean; message: string };
  if (!json.status) throw new Error(json.message || "BVN validation failed");
}

// ─── DVA: Create dedicated virtual account ─────────────────────────────────────

export type DVAPreferredBank = "wema-bank" | "titan-paystack" | "access-bank" | "zenith-bank";

export type CreateDVAResult = {
  account_number: string;
  bank_name: string;
  bank_code: string;
};

export async function createDedicatedVirtualAccount(
  customerCode: string,
  preferredBank: DVAPreferredBank = "wema-bank"
): Promise<CreateDVAResult> {
  const res = await fetch(`${PAYSTACK_BASE}/dedicated_account`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ customer: customerCode, preferred_bank: preferredBank }),
  });
  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data: {
      account_number: string;
      bank: { name: string; slug: string; code?: string };
    };
  };
  if (!json.status) throw new Error(json.message || "DVA creation failed");
  return {
    account_number: json.data.account_number,
    bank_name: json.data.bank.name,
    bank_code: json.data.bank.code ?? preferredBank,
  };
}

// ─── Reference generator ───────────────────────────────────────────────────────

// Unambiguous uppercase chars — no 0/O, 1/I confusion
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rnd = Array.from(
    { length: 5 },
    () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]
  ).join("");
  return `LB-${yy}${mm}-${rnd}`;
}
