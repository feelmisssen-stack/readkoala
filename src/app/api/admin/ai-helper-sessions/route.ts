import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { listAiHelperSessionsForAdmin } from "@/lib/ai-helper-log";

export async function GET() {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  return NextResponse.json({ sessions: await listAiHelperSessionsForAdmin() });
}
