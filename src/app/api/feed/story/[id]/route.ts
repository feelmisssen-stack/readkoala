import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { buildPublicStorySections } from "@/lib/reflection-public-view";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();

  let bookId: string | undefined;
  let reflection = db.reflections.find((entry) => entry.id === id);

  if (id.startsWith("book-")) {
    bookId = id.slice(5);
    reflection = db.reflections.find((entry) => entry.bookId === bookId) ?? reflection;
  } else if (reflection) {
    bookId = reflection.bookId;
  }

  if (!bookId) {
    return NextResponse.json({ error: "기록을 찾을 수 없어요." }, { status: 404 });
  }

  const book = db.books.find((entry) => entry.id === bookId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  const username = db.users.find((user) => user.id === book.userId)?.username || "친구";

  return NextResponse.json({
    story: {
      id,
      username,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        coverUrl: book.coverUrl,
        readingProgress: book.readingProgress,
        currentPage: book.currentPage,
        totalPages: book.totalPages,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        finishedAt: book.finishedAt,
      },
      sections: buildPublicStorySections(reflection ?? null),
    },
  });
}
