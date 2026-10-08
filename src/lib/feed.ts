import type { CarouselFeedItem, CarouselMoment, Database, RandomFeedItem, Reflection } from "./types";
import { buildUserDisplayMap } from "./user-display";
import { isMemorableScenePublic } from "./image-moderation";
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
  const userMap = buildUserDisplayMap(db.users);

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
      username: userMap.get(s.userId) || s.username,
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
  if (isMemorableScenePublic(reflection)) {
    moments.push({ kind: "memorable_scene", imageUrl: reflection.memorableSceneImage!.trim() });
  }

  return moments;
}

/** 이름(username)은 비워 두고 userId를 함께 담는다. 이름은 화면에 보낼 쪽만 따로 채운다 */
export type CarouselFeedEntry = Omit<CarouselFeedItem, "username" | "readers"> & { userId: string };

export function buildCarouselFeed(db: Pick<Database, "books" | "reflections">): CarouselFeedEntry[] {
  const bookMap = new Map(db.books.map((b) => [b.id, b]));
  const reflectedBookIds = new Set<string>();
  const items: CarouselFeedEntry[] = [];

  const sortedReflections = [...db.reflections].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const reflection of sortedReflections) {
    const book = bookMap.get(reflection.bookId);
    const moments = buildMomentsFromReflection(reflection, book?.title);
    if (!book && moments.length === 0) continue;

    reflectedBookIds.add(reflection.bookId);
    items.push({
      id: reflection.id,
      bookId: reflection.bookId,
      userId: reflection.userId,
      bookTitle: book?.title || "책",
      bookAuthor: book?.author,
      coverUrl: book?.coverUrl,
      updatedAt: reflection.updatedAt,
      moments,
    });
  }

  const sortedBooks = [...db.books].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const book of sortedBooks) {
    if (reflectedBookIds.has(book.id)) continue;

    items.push({
      id: `book-${book.id}`,
      bookId: book.id,
      userId: book.userId,
      bookTitle: book.title,
      bookAuthor: book.author,
      coverUrl: book.coverUrl,
      updatedAt: book.updatedAt,
      moments: [],
    });
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export const READERS_PER_FEED_TILE = 3;

export type CarouselFeedReaderEntry = Pick<CarouselFeedEntry, "id" | "userId" | "updatedAt" | "moments">;
export type CarouselFeedGroupEntry = CarouselFeedEntry & { readers: CarouselFeedReaderEntry[] };

/** "어린 왕자 - 개정판", "어린 왕자(양장)"처럼 부제·괄호만 다른 제목도 같은 책으로 본다 */
function bookGroupKey(title: string): string {
  return title
    .split(" - ")[0]
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .toLowerCase();
}

/**
 * 같은 책을 읽은 기록을 최근 순으로 3명씩 묶어 표지 하나로 만든다.
 * 6명이 읽었으면 표지 2개, 2명이면 1개.
 */
export function groupCarouselFeed(
  entries: CarouselFeedEntry[],
  perTile = READERS_PER_FEED_TILE
): CarouselFeedGroupEntry[] {
  const byBook = new Map<string, CarouselFeedEntry[]>();
  for (const entry of entries) {
    const key = bookGroupKey(entry.bookTitle) || entry.bookId;
    const list = byBook.get(key);
    if (list) list.push(entry);
    else byBook.set(key, [entry]);
  }

  const groups: CarouselFeedGroupEntry[] = [];
  for (const list of byBook.values()) {
    for (let i = 0; i < list.length; i += perTile) {
      const chunk = list.slice(i, i + perTile);
      const lead = chunk[0];
      groups.push({
        ...lead,
        coverUrl: chunk.find((entry) => entry.coverUrl)?.coverUrl,
        readers: chunk.map(({ id, userId, updatedAt, moments }) => ({ id, userId, updatedAt, moments })),
      });
    }
  }

  return groups.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
