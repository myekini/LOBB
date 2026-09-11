import { redirect } from "next/navigation";

// /dashboard already IS the bookings list — this used to be a silent
// re-export of that exact same component under a second URL. A redirect is
// the honest version: one page, one canonical address; this one's kept only
// because something may still link here.
export default function DashboardBookingsRedirect() {
  redirect("/dashboard");
}
