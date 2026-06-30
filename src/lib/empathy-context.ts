import { getBookById } from "@/lib/repositories/books-repository";
import {
  getReflectionByBookId,
  getReflectionById,
} from "@/lib/repositories/reflections-repository";

export async function resolveStoryContext(storyId: string) {
  let bookId: string | undefined;
  let reflection = null;

  if (storyId.startsWith("book-")) {
    bookId = storyId.slice(5);
    reflection = await getReflectionByBookId(bookId);
  } else {
    reflection = await getReflectionById(storyId);
    if (reflection) {
      bookId = reflection.bookId;
    }
  }

  const book = bookId ? await getBookById(bookId) : undefined;

  return { bookId, book, reflection };
}
