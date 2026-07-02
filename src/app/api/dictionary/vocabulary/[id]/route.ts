import { NextResponse } from "next/server";
import { deleteVocabularyEntryForUser } from "@/lib/repositories/vocabulary-repository";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteVocabularyEntryForUser(id, session.userId);
  if (!deleted) {
    return NextResponse.json({ error: "낱말을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
