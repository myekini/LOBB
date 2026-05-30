import { NextResponse } from "next/server";
import { appError, type AppErrorCode } from "@/lib/app-errors";

export function apiError(
  code: AppErrorCode,
  status = 400,
  overrides: Parameters<typeof appError>[1] = {}
) {
  return NextResponse.json(appError(code, overrides), { status });
}
