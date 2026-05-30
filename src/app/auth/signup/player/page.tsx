"use client";

import { Suspense } from "react";
import { AuthEmailForm, LoginSkeleton } from "@/features/auth/auth-email-form";

export default function PlayerSignupPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthEmailForm forcedMode="signup" forcedRole="player" />
    </Suspense>
  );
}
