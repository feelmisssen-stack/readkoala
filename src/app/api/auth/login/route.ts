import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const db = readDb();
  const user = db.users.find((u) => u.username === username.trim());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀려요." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.isAdmin = user.isAdmin;
  await session.save();

  return NextResponse.json({ ok: true, user: { username: user.username, isAdmin: user.isAdmin } });
}
