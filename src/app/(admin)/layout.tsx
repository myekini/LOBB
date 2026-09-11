import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api-auth";

// Defence in depth. Middleware already redirects non-admins away from /admin*,
// but this guarantees every page in the (admin) group — including any future
// Server Component that reads data directly — is admin-only by default.
export default async function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireRole("admin");
  if (auth.error) redirect(auth.status === 401 ? "/auth/login" : "/");
  return <>{children}</>;
}
