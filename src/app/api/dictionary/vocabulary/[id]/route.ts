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
  const entry = db.vocabulary.find((v) => v.id === id);
  if (!entry) {
    return NextResponse.json({ error: "낱말을 찾을 수 없어요." }, { status: 404 });
  }
  if (entry.userId !== session.userId) {
    return NextResponse.json({ error: "내 낱말집에서만 지울 수 있어요." }, { status: 403 });
  }

  updateDb((d) => {
    d.vocabulary = d.vocabulary.filter((v) => v.id !== id);
  });

  return NextResponse.json({ ok: true });
}
