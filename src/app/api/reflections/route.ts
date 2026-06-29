import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { rejectInvalidReflectionBody } from "@/lib/content-filter-api";
import { countReflectionChars, calculateLevel } from "@/lib/gamification";
import { applyReadingMilestones } from "@/lib/reading-dates";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  const db = readDb();
  let reflections = db.reflections.filter((r) => r.userId === session.userId);

  if (bookId) {
    reflections = reflections.filter((r) => r.bookId === bookId);
  }

  reflections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ reflections });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const body = await request.json();
  const db = readDb();
  const book = db.books.find((b) => b.id === body.bookId && b.userId === session.userId);
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
  const existing = db.reflections.find(
    (r) => r.userId === session.userId && r.bookId === body.bookId
  );

  const reflection = existing
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

  updateDb((d) => {
    if (existing) {
      const idx = d.reflections.findIndex((r) => r.id === existing.id);
      d.reflections[idx] = reflection;
    } else {
      d.reflections.push(reflection);
    }
    const user = d.users.find((u) => u.id === session.userId);
    if (user && charCount > 0) {
      user.stats.totalChars += charCount;
      user.stats.level = calculateLevel(user.stats);
    }
    const b = d.books.find((x) => x.id === body.bookId);
    if (b && b.readingProgress < 100) {
      b.readingProgress = Math.max(b.readingProgress, 80);
      b.updatedAt = now;
      applyReadingMilestones(b, now);
    }
  });

  return NextResponse.json({ reflection });
}
