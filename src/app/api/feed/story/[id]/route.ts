import { NextResponse } from "next/server";
import { buildPublicStorySections } from "@/lib/reflection-public-view";
import { getDisplayName } from "@/lib/user-display";
import { getBookById } from "@/lib/repositories/books-repository";
import {
  getReflectionByBookId,
  getReflectionById,
} from "@/lib/repositories/reflections-repository";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let bookId: string | undefined;
  let reflection = await getReflectionById(id);

  if (id.startsWith("book-")) {
    bookId = id.slice(5);
    reflection = (await getReflectionByBookId(bookId)) ?? reflection;
  } else if (reflection) {
    bookId = reflection.bookId;
  }

  if (!bookId) {
    return NextResponse.json({ error: "기록을 찾을 수 없어요." }, { status: 404 });
  }

  const book = await getBookById(bookId);
  if (!book) {
    return NextResponse.json({ error: "책을 찾을 수 없어요." }, { status: 404 });
  }

  const db = await loadFeedDatabase();
  const author = db.users.find((user) => user.id === book.userId);
  const username = author ? getDisplayName(author) : "친구";

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
