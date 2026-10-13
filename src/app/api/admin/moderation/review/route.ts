import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import {
  approveMemorableScene,
  rejectMemorableScene,
  reviewTextReport,
} from "@/lib/admin-moderation";

export async function POST(request: Request) {
  let reviewedBy: string | undefined;
  try {
    const session = await requireGoogleAdmin();
    reviewedBy = session.googleAdminName || session.googleAdminEmail;
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  try {
    if (body.reflectionId) {
      if (action === "approve") await approveMemorableScene(body.reflectionId, reviewedBy);
      else await rejectMemorableScene(body.reflectionId, reviewedBy);
      return NextResponse.json({ ok: true });
    }
    if (body.reportId) {
      await reviewTextReport(body.reportId, action === "approve" ? "approved" : "rejected", reviewedBy);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "처리에 실패했어요." }, { status: 500 });
  }
}
