import { NextResponse } from "next/server";
import { updateDb } from "@/lib/db";
import { requireGoogleAdmin } from "@/lib/admin-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;

  updateDb((d) => {
    d.users = d.users.filter((u) => u.id !== id);
    d.books = d.books.filter((b) => b.userId !== id);
    d.reflections = d.reflections.filter((r) => r.userId !== id);
    d.vocabulary = d.vocabulary.filter((v) => v.userId !== id);
    d.sharedSentences = d.sharedSentences.filter((s) => s.userId !== id);
    d.chatMemberships = d.chatMemberships.filter((m) => m.userId !== id);
    d.chatMessages = d.chatMessages.filter((m) => m.userId !== id);
    d.chatRooms = d.chatRooms.filter((r) => r.creatorId !== id);
  });

  return NextResponse.json({ ok: true });
}
