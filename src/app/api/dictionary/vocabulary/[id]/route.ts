import { NextResponse } from "next/server";

export async function DELETE() {
  return NextResponse.json(
    { error: "낱말집 삭제는 브라우저에서 바로 처리됩니다." },
    { status: 410 }
  );
}
