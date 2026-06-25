import type { Database, StoryEmpathy } from "./types";

export const MAX_HEART_COUNT = 3;

export function normalizeHeartCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(MAX_HEART_COUNT, Math.floor(parsed));
}

export function getEmpathyRecordsForBook(db: Database, bookId: string) {
  return db.storyEmpathies.filter((entry) => entry.bookId === bookId);
}

export function sumHeartCounts(records: StoryEmpathy[]) {
  return records.reduce((sum, record) => sum + normalizeHeartCount(record.heartCount), 0);
}

export function buildEmpathyResponseForBook(
  db: Database,
  bookId: string,
  authorUserId: string,
  sessionUserId?: string
) {
  const records = getEmpathyRecordsForBook(db, bookId);
  const myRecord = sessionUserId
    ? records.find((entry) => entry.voterUserId === sessionUserId)
    : undefined;

  return {
    totalHearts: sumHeartCounts(records),
    myHeartCount: normalizeHeartCount(myRecord?.heartCount),
    canVote: Boolean(sessionUserId && sessionUserId !== authorUserId),
    isOwnStory: Boolean(sessionUserId && sessionUserId === authorUserId),
    voterCount: records.filter((entry) => normalizeHeartCount(entry.heartCount) > 0).length,
  };
}

export function resolveStoryContext(db: Database, storyId: string) {
  let bookId: string | undefined;
  const reflection = storyId.startsWith("book-")
    ? db.reflections.find((entry) => entry.bookId === storyId.slice(5))
    : db.reflections.find((entry) => entry.id === storyId);

  if (storyId.startsWith("book-")) {
    bookId = storyId.slice(5);
  } else if (reflection) {
    bookId = reflection.bookId;
  }

  const book = bookId ? db.books.find((entry) => entry.id === bookId) : undefined;

  return { bookId, book, reflection };
}
