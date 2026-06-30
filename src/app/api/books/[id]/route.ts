import { NextResponse } from "next/server";
import { calcProgressFromPages } from "@/lib/reading-progress";
import { applyReadingMilestones } from "@/lib/reading-dates";
import { getSession } from "@/lib/session";
import { rejectInvalidContent } from "@/lib/content-filter-api";
import {
  deleteBookForUser,
  getBookById,
  getBookForUser,
  saveBook,
} from "@/lib/repositories/books-repository";
import { deleteReflectionsForBook } from "@/lib/repositories/reflections-repository";
import { deleteStoryEmpathiesForBook } from "@/lib/repositories/story-empathies-repository";
import { deleteChatRoomsByBookId } from "@/lib/repositories/chat-repository";
import { syncBooksReadStat } from "@/lib/repositories/user-stats-repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const book = await getBookById(id);
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
  if (body.title) {
    const blocked = rejectInvalidContent(body.title);
    if (blocked) return blocked;
  }

  const book = await getBookForUser(id, session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  if (body.title) book.title = body.title;
  if (body.totalPages !== undefined) {
    book.totalPages = body.totalPages > 0 ? body.totalPages : undefined;
  }

  if (body.currentPage !== undefined) {
    book.currentPage = Math.max(0, body.currentPage);
    if (book.totalPages && book.totalPages > 0) {
      book.readingProgress = calcProgressFromPages(book.currentPage, book.totalPages);
    }
  } else if (body.readingProgress !== undefined) {
    book.readingProgress = body.readingProgress;
  }

  if (
    body.totalPages !== undefined &&
    body.currentPage === undefined &&
    book.currentPage &&
    book.totalPages
  ) {
    book.readingProgress = calcProgressFromPages(book.currentPage, book.totalPages);
  }

  const now = new Date().toISOString();
  book.updatedAt = now;
  applyReadingMilestones(book, now);

  await saveBook(book);

  if (book.readingProgress >= 100) {
    await syncBooksReadStat(session.userId, session.firebaseUid);
  }

  return NextResponse.json({
    ok: true,
    book: {
      readingProgress: book.readingProgress,
      currentPage: book.currentPage,
      readingStartedAt: book.readingStartedAt,
      finishedAt: book.finishedAt,
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { id } = await params;
  const book = await getBookForUser(id, session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  await deleteBookForUser(id, session.userId);
  await deleteReflectionsForBook(id);
  await deleteStoryEmpathiesForBook(id);
  await deleteChatRoomsByBookId(id);

  await syncBooksReadStat(session.userId, session.firebaseUid);

  return NextResponse.json({ ok: true });
}
