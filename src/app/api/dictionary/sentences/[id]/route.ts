import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteSharedSentenceForUser } from "@/lib/repositories/shared-sentences-repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteSharedSentenceForUser(id, session.userId);
  if (!deleted) {
    return NextResponse.json({ error: "문장을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
