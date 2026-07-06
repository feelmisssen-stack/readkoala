import { NextResponse } from "next/server";
import { getGoogleAdmin } from "@/lib/admin-auth";
import { GOOGLE_ADMIN_USERNAME } from "@/lib/admin-google-account";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getGoogleAdmin();
  return NextResponse.json({
    admin: admin ? { ...admin, username: GOOGLE_ADMIN_USERNAME } : null,
  });
}
