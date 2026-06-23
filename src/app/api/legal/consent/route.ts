import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { isLegalDocumentName, logLegalConsent, type LegalDocumentName } from "@/lib/legal-consent";

export async function POST(request: Request) {
  const auth = await requireRole(["player", "coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    documents?: unknown;
    metadata?: Record<string, unknown>;
  };

  const documents = Array.isArray(body.documents) ? body.documents : [];
  const validDocuments = documents.filter(isLegalDocumentName) as LegalDocumentName[];

  if (validDocuments.length === 0) {
    return NextResponse.json({ error: "No valid legal documents were provided." }, { status: 400 });
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent");

  await Promise.all(
    validDocuments.map((documentName) =>
      logLegalConsent({
        admin: auth.admin,
        userId: auth.user.id,
        documentName,
        ipAddress,
        userAgent,
        metadata: body.metadata ?? {},
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
