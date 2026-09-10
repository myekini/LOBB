// Bank brand logos for the payout / bank-account displays.
//
// Paystack's bank list carries no logos, so we join it to the community
// nigerianbanks.xyz dataset on the CBN bank code (both sources use the same
// codes; their slugs differ, the codes don't). Traditional banks are well
// covered; most fintechs (OPay, Moniepoint, PalmPay, …) are not in the dataset,
// so callers must fall back to a generic glyph — see <BankLogo>.

const SOURCE_URL = "https://nigerianbanks.xyz";
const MEMO_TTL_MS = 24 * 60 * 60 * 1000;

type NigerianBank = { name: string; slug: string; code: string; logo: string };

let memo: { at: number; byCode: Map<string, string> } | null = null;

/**
 * Map of `bank code -> logo URL`. Cached in-process for a day; on any fetch or
 * parse failure it returns the last good map (or an empty one), so a flaky CDN
 * never breaks the bank pages.
 */
export async function bankLogosByCode(): Promise<Map<string, string>> {
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.byCode;

  try {
    const res = await fetch(SOURCE_URL, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`nigerianbanks.xyz ${res.status}`);
    const data = (await res.json()) as NigerianBank[];

    const byCode = new Map<string, string>();
    for (const bank of data) {
      if (bank?.code && bank?.logo) byCode.set(bank.code, bank.logo);
    }
    memo = { at: Date.now(), byCode };
    return byCode;
  } catch {
    return memo?.byCode ?? new Map();
  }
}
