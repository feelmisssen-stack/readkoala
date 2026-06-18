import { NextResponse } from "next/server";
import { getGoogleAdmin } from "@/lib/admin-auth";

export async function GET() {
  const admin = await getGoogleAdmin();
  return NextResponse.json({ admin });
}
