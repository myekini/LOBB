import { redirect } from "next/navigation";

export default function CreateCoachProfileRedirect() {
  redirect("/auth/setup/coach/1");
}
