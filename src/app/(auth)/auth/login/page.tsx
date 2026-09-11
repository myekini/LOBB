"use client";

import { Suspense } from "react";
import { AuthLoginForm } from "@/features/auth/auth-login-form";
import { LoginSkeleton } from "@/features/auth/auth-email-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthLoginForm />
    </Suspense>
  );
}
