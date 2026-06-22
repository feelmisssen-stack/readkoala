import type { CarouselFeedItem, CarouselMoment, Database, RandomFeedItem, Reflection } from "./types";
import {
  BEFORE_READING_QUESTIONS,
  DURING_READING_QUESTIONS,
  stripBookTitleFromAssociation,
} from "./reflection-templates";

const READING_PROMPT_LABELS = new Set([
  ...BEFORE_READING_QUESTIONS.map((q) => q.question),
  ...DURING_READING_QUESTIONS.map((q) => q.question),
]);

function extractUserAsk(answer: string): string | null {
  const match = answer.match(/질문:\s*([^/]+)/);
  return match?.[1]?.trim() || null;
}

/** 읽기 전/중 폼의 「질문하기」 칸(ask)에 적은 내용만 수집 */
function collectUserAsks(
  pairs: Reflection["beforeReadingPairs"],
  activities: Reflection["beforeReadingActivities"],
  legacy: Reflection["beforeReading"]
): string[] {
  const asks: string[] = [];

  for (const pair of pairs ?? []) {
    const ask = pair.ask?.trim();
    if (!ask) continue;
    if (pair.activityKey) {
      const activity = activities?.find((a) => a.key === pair.activityKey);
      if (activity && !activity.checked) continue;
    }
    asks.push(ask);
  }
  if (asks.length > 0) return asks;

  for (const entry of legacy) {
    const fromAnswer = entry.answer?.trim() ? extractUserAsk(entry.answer) : null;
    if (fromAnswer) {
      asks.push(fromAnswer);
      continue;
    }
    const q = entry.question?.trim();
    if (
      q &&
      entry.answer?.trim() &&
      !READING_PROMPT_LABELS.has(q) &&
      !entry.answer.includes("질문:")
    ) {
      asks.push(q);
    }
  }

  return asks;
}

function addReadingMoments(
  moments: CarouselMoment[],
  kind: "before_question" | "during_question",
  pairs: Reflection["beforeReadingPairs"],
  activities: Reflection["beforeReadingActivities"],
  legacy: Reflection["beforeReading"]
) {
  for (const ask of collectUserAsks(pairs, activities, legacy)) {
    moments.push({ kind, text: ask });
  }
}

export function buildRandomFeed(db: Database): RandomFeedItem[] {
  const items: RandomFeedItem[] = [];
  const bookMap = new Map(db.books.map((b) => [b.id, b]));
  const userMap = new Map(db.users.map((u) => [u.id, u.username]));

  for (const r of db.reflections) {
    const book = bookMap.get(r.bookId);
    const username = userMap.get(r.userId) || "친구";
    const bookTitle = book?.title || "책";

    for (const ask of collectUserAsks(
      r.beforeReadingPairs,
      r.beforeReadingActivities,
      r.beforeReading
    )) {
      items.push({ type: "before_question", text: ask, bookTitle, username });
    }
    for (const ask of collectUserAsks(
      r.duringReadingPairs,
      r.duringReadingActivities,
      r.duringReading
    )) {
      items.push({ type: "during_question", text: ask, bookTitle, username });
    }
    if (r.association?.trim()) {
      const suffix = stripBookTitleFromAssociation(bookTitle, r.association);
      const text = suffix.trim() || r.association.trim();
      items.push({ type: "association", text, bookTitle, username });
    }
    if (r.favoriteQuote?.trim()) {
      items.push({ type: "quote", text: r.favoriteQuote, bookTitle, username });
    }
  }

  for (const s of db.sharedSentences) {
    items.push({
      type: "shared_sentence",
      text: s.sentence,
      word: s.word,
      username: s.username,
    });
  }

  return items;
}

export function pickRandomItem(items: RandomFeedItem[]): RandomFeedItem | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export function getReflectionSnippet(reflection: Reflection): string[] {
  const snippets: string[] = [];
  for (const q of reflection.beforeReading) {
    if (q.answer) snippets.push(q.answer);
  }
  for (const q of reflection.duringReading) {
    if (q.answer) snippets.push(q.answer);
  }
  if (reflection.association) snippets.push(reflection.association);
  if (reflection.favoriteQuote) snippets.push(reflection.favoriteQuote);
  return snippets;
}

function buildMomentsFromReflection(reflection: Reflection, bookTitle?: string): CarouselMoment[] {
  const moments: CarouselMoment[] = [];

  addReadingMoments(
    moments,
    "before_question",
    reflection.beforeReadingPairs,
    reflection.beforeReadingActivities,
    reflection.beforeReading
  );
  addReadingMoments(
    moments,
    "during_question",
    reflection.duringReadingPairs,
    reflection.duringReadingActivities,
    reflection.duringReading
  );

  if (reflection.association?.trim()) {
    const suffix = bookTitle
      ? stripBookTitleFromAssociation(bookTitle, reflection.association)
      : reflection.association.trim();
    const text = suffix.trim() || reflection.association.trim();
    moments.push({ kind: "association", text });
  }
  if (reflection.favoriteQuote?.trim()) {
    moments.push({ kind: "quote", text: reflection.favoriteQuote.trim() });
  }
  if (reflection.memorableSceneImage?.trim()) {
    moments.push({ kind: "memorable_scene", imageUrl: reflection.memorableSceneImage.trim() });
  }

  return moments;
}

export function buildCarouselFeed(db: Database, excludeUserId?: string): CarouselFeedItem[] {
  const bookMap = new Map(db.books.map((b) => [b.id, b]));
  const userMap = new Map(db.users.map((u) => [u.id, u.username]));
  const reflectedBookIds = new Set<string>();
  const items: CarouselFeedItem[] = [];

  const sortedReflections = [...db.reflections].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const reflection of sortedReflections) {
    if (excludeUserId && reflection.userId === excludeUserId) continue;

    const book = bookMap.get(reflection.bookId);
    const moments = buildMomentsFromReflection(reflection, book?.title);
    if (!book && moments.length === 0) continue;

    reflectedBookIds.add(reflection.bookId);
    items.push({
      id: reflection.id,
      bookId: reflection.bookId,
      username: userMap.get(reflection.userId) || "친구",
      bookTitle: book?.title || "책",
      bookAuthor: book?.author,
      coverUrl: book?.coverUrl,
      moments,
    });
  }

  const sortedBooks = [...db.books].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const book of sortedBooks) {
    if (excludeUserId && book.userId === excludeUserId) continue;
    if (reflectedBookIds.has(book.id)) continue;

    items.push({
      id: `book-${book.id}`,
      bookId: book.id,
      username: userMap.get(book.userId) || "친구",
      bookTitle: book.title,
      bookAuthor: book.author,
      coverUrl: book.coverUrl,
      moments: [],
    });
  }

  return items;
}

export function buildPersonalMoments(db: Database, userId: string): CarouselMoment[] {
  const bookMap = new Map(db.books.map((b) => [b.id, b]));
  const reflections = db.reflections
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const moments: CarouselMoment[] = [];
  for (const reflection of reflections) {
    const bookTitle = bookMap.get(reflection.bookId)?.title;
    for (const moment of buildMomentsFromReflection(reflection, bookTitle)) {
      moments.push({ ...moment, bookTitle });
    }
  }
  return moments;
}
