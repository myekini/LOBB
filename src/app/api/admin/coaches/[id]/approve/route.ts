import { POST as decide } from "@/app/api/admin/coaches/[id]/decision/route";

export async function POST(request: Request, context: { params: { id: string } }) {
  return decide(
    new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    }),
    context
  );
}
