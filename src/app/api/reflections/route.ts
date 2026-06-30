import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getSession } from "@/lib/session";
import { rejectInvalidReflectionBody } from "@/lib/content-filter-api";
import { countReflectionChars } from "@/lib/gamification";
import { applyReadingMilestones } from "@/lib/reading-dates";
import { getBookForUser, saveBook } from "@/lib/repositories/books-repository";
import {
  getReflectionByUserAndBook,
  listReflectionsByUserId,
  saveReflection,
} from "@/lib/repositories/reflections-repository";
import { addReflectionChars } from "@/lib/repositories/user-stats-repository";
import type { Reflection } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const reflections = await listReflectionsByUserId(
    session.userId,
    bookId || undefined
  );

  return NextResponse.json({ reflections });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const book = await getBookForUser(body.bookId, session.userId);
  const blocked = rejectInvalidReflectionBody(body, {
    userId: session.userId,
    bookId: body.bookId,
    bookTitle: book?.title,
  });
  if (blocked) return blocked;

  if (!book) {
    return NextResponse.json({ error: "책을 먼저 등록해 주세요." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const existing = await getReflectionByUserAndBook(session.userId, body.bookId);

  const reflection: Reflection = existing
    ? {
        ...existing,
        beforeReadingActivities: body.beforeReadingActivities ?? existing.beforeReadingActivities,
        beforeReadingPairs: body.beforeReadingPairs ?? existing.beforeReadingPairs,
        beforeReading: body.beforeReading ?? existing.beforeReading,
        duringReadingActivities: body.duringReadingActivities ?? existing.duringReadingActivities,
        duringReadingPairs: body.duringReadingPairs ?? existing.duringReadingPairs,
        duringReading: body.duringReading ?? existing.duringReading,
        association: body.association ?? existing.association,
        favoriteQuote: body.favoriteQuote ?? existing.favoriteQuote,
        reviewTitle: body.reviewTitle ?? existing.reviewTitle,
        reviewReason: body.reviewReason ?? existing.reviewReason,
        reviewContent: body.reviewContent ?? existing.reviewContent,
        reviewImpressiveScene: body.reviewImpressiveScene ?? existing.reviewImpressiveScene,
        reviewThoughts: body.reviewThoughts ?? existing.reviewThoughts,
        updatedAt: now,
      }
    : {
        id: uuid(),
        userId: session.userId,
        bookId: body.bookId,
        beforeReading: body.beforeReading || [],
        beforeReadingActivities: body.beforeReadingActivities || [],
        beforeReadingPairs: body.beforeReadingPairs || [],
        duringReading: body.duringReading || [],
        duringReadingActivities: body.duringReadingActivities || [],
        duringReadingPairs: body.duringReadingPairs || [],
        association: body.association || "",
        favoriteQuote: body.favoriteQuote || "",
        reviewTitle: body.reviewTitle || "",
        reviewReason: body.reviewReason || "",
        reviewContent: body.reviewContent || "",
        reviewImpressiveScene: body.reviewImpressiveScene || "",
        reviewThoughts: body.reviewThoughts || "",
        createdAt: now,
        updatedAt: now,
      };

  const charCount = existing ? 0 : countReflectionChars(reflection);
  await saveReflection(reflection);

  if (charCount > 0) {
    await addReflectionChars(session.userId, charCount, session.firebaseUid);
  }

  if (book.readingProgress < 100) {
    book.readingProgress = Math.max(book.readingProgress, 80);
    book.updatedAt = now;
    applyReadingMilestones(book, now);
    await saveBook(book);
  }

  return NextResponse.json({ reflection });
}
