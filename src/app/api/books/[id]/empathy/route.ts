import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { buildEmpathyResponseForBook, normalizeHeartCount } from "@/lib/empathy";
import { getBookById } from "@/lib/repositories/books-repository";
import {
  listStoryEmpathiesByBookId,
  upsertStoryEmpathy,
} from "@/lib/repositories/story-empathies-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookId } = await params;
  const session = await getSession();
  const book = await getBookById(bookId);

  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  const records = await listStoryEmpathiesByBookId(bookId);
  return NextResponse.json(
    buildEmpathyResponseForBook(records, book.userId, session.userId)
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
  const book = await getBookById(bookId);

  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  if (book.userId === session.userId) {
    return NextResponse.json({ error: "내 기록에는 공감할 수 없어요." }, { status: 400 });
  }

  const body = await request.json();
  const heartCount = normalizeHeartCount(body.heartCount);
  const storyId = typeof body.storyId === "string" ? body.storyId : `book-${bookId}`;

  await upsertStoryEmpathy({
    bookId,
    storyId,
    authorUserId: book.userId,
    voterUserId: session.userId,
    heartCount,
  });

  const records = await listStoryEmpathiesByBookId(bookId);
  return NextResponse.json(
    buildEmpathyResponseForBook(records, book.userId, session.userId)
  );
}
