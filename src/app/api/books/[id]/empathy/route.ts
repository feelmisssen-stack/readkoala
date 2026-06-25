import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { buildEmpathyResponseForBook, normalizeHeartCount } from "@/lib/empathy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params;
  const session = await getSession();
  const db = readDb();
  const book = db.books.find((entry) => entry.id === bookId);

  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  return NextResponse.json(
    buildEmpathyResponseForBook(db, bookId, book.userId, session.userId)
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id: bookId } = await params;
  const db = readDb();
  const book = db.books.find((entry) => entry.id === bookId);

  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  if (book.userId === session.userId) {
    return NextResponse.json({ error: "내 기록에는 공감할 수 없어요." }, { status: 400 });
  }

  const body = await request.json();
  const heartCount = normalizeHeartCount(body.heartCount);
  const storyId = typeof body.storyId === "string" ? body.storyId : `book-${bookId}`;
  const now = new Date().toISOString();

  updateDb((draft) => {
    const existing = draft.storyEmpathies.find(
      (entry) => entry.bookId === bookId && entry.voterUserId === session.userId
    );

    if (existing) {
      existing.heartCount = heartCount;
      existing.storyId = storyId;
      existing.updatedAt = now;
      return;
    }

    if (heartCount === 0) return;

    draft.storyEmpathies.push({
      id: uuid(),
      storyId,
      bookId,
      authorUserId: book.userId,
      voterUserId: session.userId!,
      heartCount,
      createdAt: now,
      updatedAt: now,
    });
  });

  const updated = readDb();
  return NextResponse.json(
    buildEmpathyResponseForBook(updated, bookId, book.userId, session.userId)
  );
}
