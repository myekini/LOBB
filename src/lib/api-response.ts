import { NextResponse } from "next/server";
import { appError, type AppErrorCode } from "@/lib/app-errors";

export function apiError(
  code: AppErrorCode,
  status = 400,
  overrides: Parameters<typeof appError>[1] = {}
) {
  return NextResponse.json(appError(code, overrides), { status });
}

// Logs the raw DB/Supabase error server-side and returns a generic 500 to the client.
// Never pass error.message directly to NextResponse — it leaks table/column names.
export function internalError(error?: { message?: string }, code: AppErrorCode = "UNKNOWN_ERROR") {
  if (error?.message) {
    console.error("[API]", error.message);
  }
  return apiError(code, 500);
}
