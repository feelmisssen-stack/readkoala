import { NextResponse } from "next/server";
import { getGoogleAdminFromSession } from "@/lib/admin-auth";
import { GOOGLE_ADMIN_USERNAME } from "@/lib/admin-google-account";
import { getSession } from "@/lib/session";
import { ensureGoogleAdminLinkedInSession } from "@/lib/users/admin-app-bridge";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  await ensureGoogleAdminLinkedInSession(session);

  const admin = getGoogleAdminFromSession(session);
  return NextResponse.json({
    admin: admin ? { ...admin, username: GOOGLE_ADMIN_USERNAME } : null,
  });
}
