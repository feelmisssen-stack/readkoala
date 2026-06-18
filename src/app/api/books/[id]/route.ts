import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const db = readDb();
  const book = db.books.find((b) => b.id === id);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }
  if (session.userId && book.userId !== session.userId) {
    return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });
  }
  return NextResponse.json({ book });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const db = readDb();
  const book = db.books.find((b) => b.id === id && b.userId === session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  updateDb((d) => {
    const b = d.books.find((x) => x.id === id)!;
    if (body.readingProgress !== undefined) b.readingProgress = body.readingProgress;
    if (body.title) b.title = body.title;
    b.updatedAt = new Date().toISOString();

    if (body.readingProgress >= 100) {
      const user = d.users.find((u) => u.id === session.userId);
      if (user) {
        const readCount = d.books.filter(
          (bk) => bk.userId === session.userId && bk.readingProgress >= 100
        ).length;
        user.stats.booksRead = readCount;
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const db = readDb();
  const book = db.books.find((b) => b.id === id && b.userId === session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  updateDb((d) => {
    d.books = d.books.filter((b) => b.id !== id);
    d.reflections = d.reflections.filter((r) => r.bookId !== id);
    d.chatRooms = d.chatRooms.filter((r) => r.bookId !== id);

    const user = d.users.find((u) => u.id === session.userId);
    if (user) {
      const readCount = d.books.filter(
        (bk) => bk.userId === session.userId && bk.readingProgress >= 100
      ).length;
      user.stats.booksRead = readCount;
    }
  });

  return NextResponse.json({ ok: true });
}
