import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  const books = db.books
    .filter((b) => b.userId === session.userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ books });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  const book = {
    id: uuid(),
    userId: session.userId,
    isbn: body.isbn,
    title: body.title || "제목 없음",
    author: body.author,
    coverUrl: body.coverUrl,
    publisher: body.publisher,
    readingProgress: body.readingProgress ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  updateDb((db) => {
    db.books.push(book);
  });

  return NextResponse.json({ book });
}
