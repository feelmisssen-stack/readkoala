import { NextResponse } from "next/server";
import { getReflectionRecordLevel } from "@/lib/gamification";
import { getUserWritingGrowthFromEntries } from "@/lib/writing-growth";
import { getSession } from "@/lib/session";
import { rejectInvalidContent } from "@/lib/content-filter-api";
import { listBooksByUserId, createBook } from "@/lib/repositories/books-repository";
import { getReflectionByUserAndBook } from "@/lib/repositories/reflections-repository";
import { loadWritingGrowthDatabase } from "@/lib/repositories/feed-data";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const [books, growthData] = await Promise.all([
    listBooksByUserId(session.userId),
    loadWritingGrowthDatabase(session.userId),
  ]);

  const booksWithLevel = await Promise.all(
    books.map(async (book) => {
      const reflection = await getReflectionByUserAndBook(session.userId!, book.id);
      return {
        ...book,
        recordLevel: getReflectionRecordLevel(reflection ?? undefined),
      };
    })
  );

  const writingGrowth = getUserWritingGrowthFromEntries(
    growthData.reflections,
    growthData.sharedSentences,
    session.userId
  );

  return NextResponse.json({
    books: booksWithLevel,
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

  const book = await createBook({
    userId: session.userId,
    isbn: body.isbn,
    title: body.title || "제목 없음",
    author: body.author,
    coverUrl: body.coverUrl,
    publisher: body.publisher,
    totalPages: body.totalPages > 0 ? body.totalPages : undefined,
    currentPage: 0,
    readingProgress: 0,
  });

  return NextResponse.json({ book });
}
