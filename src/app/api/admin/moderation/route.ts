import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { listSafetyReviewItems } from "@/lib/admin-moderation";

export async function GET() {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  return NextResponse.json({ items: listSafetyReviewItems() });
}
