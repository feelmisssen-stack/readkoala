import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const db = readDb();
  const sentence = db.sharedSentences.find((s) => s.id === id);
  if (!sentence) {
    return NextResponse.json({ error: "문장을 찾을 수 없어요." }, { status: 404 });
  }
  if (sentence.userId !== session.userId) {
    return NextResponse.json({ error: "내가 쓴 문장만 지울 수 있어요." }, { status: 403 });
  }

  updateDb((d) => {
    d.sharedSentences = d.sharedSentences.filter((s) => s.id !== id);
  });

  return NextResponse.json({ ok: true });
}
