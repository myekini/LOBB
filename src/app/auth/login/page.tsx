"use client";

import { Suspense } from "react";
import { AuthEmailForm, LoginSkeleton } from "@/features/auth/auth-email-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthEmailForm forcedMode="login" />
    </Suspense>
  );
}
