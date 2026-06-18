import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { requireGoogleAdmin } from "@/lib/admin-auth";

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
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    stats: u.stats,
    bookCount: db.books.filter((b) => b.userId === u.id).length,
    reflectionCount: db.reflections.filter((r) => r.userId === u.id).length,
  }));

  return NextResponse.json({ users });
}
