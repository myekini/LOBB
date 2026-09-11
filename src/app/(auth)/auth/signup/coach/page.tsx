"use client";

import { Suspense } from "react";
import { AuthEmailForm, LoginSkeleton } from "@/features/auth/auth-email-form";

export default function CoachSignupPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthEmailForm forcedMode="signup" forcedRole="coach" />
    </Suspense>
  );
}
