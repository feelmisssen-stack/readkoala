import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  delete session.googleAdminEmail;
  delete session.googleAdminName;
  await session.save();
  return NextResponse.json({ ok: true });
}
