import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateContent } from "@/lib/content-filter";

export async function POST(request: Request) {
  const { username, password, passwordConfirm } = await request.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않아요." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 해요." }, { status: 400 });
  }

  const contentCheck = validateContent(username);
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.message }, { status: 400 });
  }

  const db = readDb();
  if (db.users.some((u) => u.username === username.trim())) {
    return NextResponse.json({ error: "이미 사용 중인 아이디예요." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isFirstUser = db.users.length === 0;

  const userId = uuid();
  updateDb((d) => {
    d.users.push({
      id: userId,
      username: username.trim(),
      passwordHash,
      isAdmin: isFirstUser,
      createdAt: new Date().toISOString(),
      stats: { booksRead: 0, totalChars: 0, chatParticipations: 0, level: 1 },
    });
  });

  const session = await getSession();
  session.userId = userId;
  session.username = username.trim();
  session.isAdmin = isFirstUser;
  await session.save();

  return NextResponse.json({ ok: true, user: { username: username.trim(), isAdmin: isFirstUser } });
}
