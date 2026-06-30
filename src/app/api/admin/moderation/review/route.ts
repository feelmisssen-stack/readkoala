import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import {
  approveMemorableScene,
  dismissModerationReport,
  rejectMemorableScene,
} from "@/lib/admin-moderation";

export async function POST(request: Request) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;

  try {
    if (body.reflectionId && action === "approve") {
      await approveMemorableScene(body.reflectionId);
      return NextResponse.json({ ok: true });
    }
    if (body.reflectionId && action === "reject") {
      await rejectMemorableScene(body.reflectionId);
      return NextResponse.json({ ok: true });
    }
    if (body.reportId && action === "dismiss") {
      await dismissModerationReport(body.reportId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "처리에 실패했어요." }, { status: 500 });
  }
}
