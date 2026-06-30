import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "낱말집은 이 기기의 브라우저에 저장됩니다. 예전 서버 데이터는 /api/dictionary/vocabulary/legacy 로 한 번만 가져올 수 있어요.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "낱말집 추가는 브라우저에서 바로 저장됩니다." },
    { status: 410 }
  );
}
