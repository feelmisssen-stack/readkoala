import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { validateContent } from "@/lib/content-filter";

export async function GET() {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const users = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    stats: u.stats,
    bookCount: db.books.filter((b) => b.userId === u.id).length,
    reflectionCount: db.reflections.filter((r) => r.userId === u.id).length,
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  const { username, password, nickname } = await request.json();
  const trimmedUsername = username?.trim();

  if (!trimmedUsername || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 해요." }, { status: 400 });
  }

  const contentCheck = validateContent(trimmedUsername);
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.message }, { status: 400 });
  }

  const trimmedNickname = nickname?.trim();
  if (trimmedNickname) {
    const nickCheck = validateContent(trimmedNickname);
    if (!nickCheck.ok) {
      return NextResponse.json({ error: nickCheck.message }, { status: 400 });
    }
  }

  const db = readDb();
  if (db.users.some((u) => u.username === trimmedUsername)) {
    return NextResponse.json({ error: "이미 사용 중인 아이디예요." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuid(),
    username: trimmedUsername,
    ...(trimmedNickname ? { nickname: trimmedNickname } : {}),
    passwordHash,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    stats: { booksRead: 0, totalChars: 0, chatParticipations: 0, level: 1 },
  };

  updateDb((d) => {
    d.users.push(user);
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      createdAt: user.createdAt,
    },
  });
}
