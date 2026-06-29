import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getReflectionRecordLevel } from "@/lib/gamification";
import { getUserWritingGrowth, getWritingGrowth } from "@/lib/writing-growth";
import { getSession } from "@/lib/session";
import { rejectInvalidContent } from "@/lib/content-filter-api";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const db = readDb();
  let writingGrowth;
  try {
    writingGrowth = getUserWritingGrowth(db, session.userId);
  } catch {
    writingGrowth = getWritingGrowth(0);
  }

  const books = db.books
    .filter((b) => b.userId === session.userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((book) => {
      const reflection = db.reflections.find(
        (r) => r.userId === session.userId && r.bookId === book.id
      );
      return {
        ...book,
        recordLevel: getReflectionRecordLevel(reflection),
      };
    });

  return NextResponse.json({
    books,
    writingGrowth,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const blocked = rejectInvalidContent(body.title, body.author);
  if (blocked) return blocked;

  const now = new Date().toISOString();

  const book = {
    id: uuid(),
    userId: session.userId,
    isbn: body.isbn,
    title: body.title || "제목 없음",
    author: body.author,
    coverUrl: body.coverUrl,
    publisher: body.publisher,
    totalPages: body.totalPages > 0 ? body.totalPages : undefined,
    currentPage: 0,
    readingProgress: 0,
    createdAt: now,
    updatedAt: now,
  };

  updateDb((db) => {
    db.books.push(book);
  });

  return NextResponse.json({ book });
}
