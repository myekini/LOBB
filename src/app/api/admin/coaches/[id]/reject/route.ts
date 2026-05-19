import { POST as decide } from "@/app/api/admin/coaches/[id]/decision/route";

export async function POST(request: Request, context: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  return decide(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason: body.reason }),
    }),
    context
  );
}
