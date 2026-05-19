import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";

export async function GET() {
  const { user, profile } = await getAuthedUser();

  if (!user || !profile) {
    return NextResponse.json({ user: null, role: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      phone: profile.phone_number,
      email: profile.email ?? user.email ?? null,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      is_active: profile.is_active ?? true,
    },
    role: profile.role,
  });
}
