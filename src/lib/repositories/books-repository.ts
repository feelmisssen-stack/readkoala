import { v4 as uuid } from "uuid";
import type { Book } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "books";

function sortByUpdatedAt(books: Book[]) {
  return [...books].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function listBooksByUserId(userId: string): Promise<Book[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  return sortByUpdatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Book, "id">) }))
  );
}

export async function listAllBooks(): Promise<Book[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Book, "id">) }));
}

export async function listRecentBooks(limit: number): Promise<Book[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Book, "id">) }));
}

export async function getBooksByIds(bookIds: string[]): Promise<Book[]> {
  const unique = [...new Set(bookIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const db = getAdminFirestore();
  const books: Book[] = [];

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const refs = chunk.map((id) => db.collection(COLLECTION).doc(id));
    const docs = await db.getAll(...refs);
    for (const doc of docs) {
      if (!doc.exists) continue;
      books.push({ id: doc.id, ...(doc.data() as Omit<Book, "id">) });
    }
  }

  return sortByUpdatedAt(books);
}

export async function getBookById(bookId: string): Promise<Book | null> {
  const doc = await getAdminFirestore().collection(COLLECTION).doc(bookId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Book, "id">) };
}

export async function getBookForUser(bookId: string, userId: string): Promise<Book | null> {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId) return null;
  return book;
}

export async function createBook(
  input: Omit<Book, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<Book> {
  const now = new Date().toISOString();
  const book: Book = {
    id: input.id ?? uuid(),
    userId: input.userId,
    isbn: input.isbn,
    title: input.title,
    author: input.author,
    coverUrl: input.coverUrl,
    publisher: input.publisher,
    totalPages: input.totalPages,
    currentPage: input.currentPage ?? 0,
    readingProgress: input.readingProgress ?? 0,
    readingStartedAt: input.readingStartedAt,
    finishedAt: input.finishedAt,
    createdAt: now,
    updatedAt: now,
  };

  const { id, ...payload } = book;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
  return book;
}

export async function saveBook(book: Book): Promise<Book> {
  const { id, ...payload } = book;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
  return book;
}

export async function deleteBookForUser(bookId: string, userId: string): Promise<boolean> {
  const book = await getBookForUser(bookId, userId);
  if (!book) return false;

  await getAdminFirestore().collection(COLLECTION).doc(bookId).delete();
  return true;
}

export async function deleteBooksForUser(userId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function countCompletedBooksForUser(userId: string): Promise<number> {
  const books = await listBooksByUserId(userId);
  return books.filter((book) => book.readingProgress >= 100).length;
}
