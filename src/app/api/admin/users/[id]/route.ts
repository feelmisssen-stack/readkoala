import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readDb, updateDb } from "@/lib/db";
import { requireGoogleAdmin } from "@/lib/admin-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const { password } = await request.json();

  if (!password || password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 해요." }, { status: 400 });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  updateDb((d) => {
    const target = d.users.find((u) => u.id === id);
    if (target) target.passwordHash = passwordHash;
  });

  return NextResponse.json({ ok: true, username: user.username });
}

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
