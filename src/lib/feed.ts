import type { CarouselFeedItem, CarouselMoment, Database, RandomFeedItem, Reflection } from "./types";

export function buildRandomFeed(db: Database): RandomFeedItem[] {
  const items: RandomFeedItem[] = [];
  const bookMap = new Map(db.books.map((b) => [b.id, b]));
  const userMap = new Map(db.users.map((u) => [u.id, u.username]));

  for (const r of db.reflections) {
    const book = bookMap.get(r.bookId);
    const username = userMap.get(r.userId) || "친구";
    const bookTitle = book?.title || "책";

    for (const q of r.beforeReading) {
      if (q.answer?.trim()) {
        items.push({
          type: "before_question",
          text: q.question ? `${q.question} → ${q.answer}` : q.answer,
          bookTitle,
          username,
        });
      }
    }
    for (const q of r.duringReading) {
      if (q.answer?.trim()) {
        items.push({
          type: "during_question",
          text: q.question ? `${q.question} → ${q.answer}` : q.answer,
          bookTitle,
          username,
        });
      }
    }
    if (r.association?.trim()) {
      items.push({ type: "association", text: r.association, bookTitle, username });
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

function buildMomentsFromReflection(reflection: Reflection): CarouselMoment[] {
  const moments: CarouselMoment[] = [];

  for (const q of reflection.beforeReading) {
    if (q.answer?.trim()) {
      moments.push({
        label: q.question?.trim() || "읽기 전 생각",
        text: q.answer.trim(),
      });
    }
  }
  for (const q of reflection.duringReading) {
    if (q.answer?.trim()) {
      moments.push({
        label: q.question?.trim() || "읽는 중 생각",
        text: q.answer.trim(),
      });
    }
  }
  if (reflection.association?.trim()) {
    moments.push({ label: "연상하는 책", text: reflection.association.trim() });
  }
  if (reflection.favoriteQuote?.trim()) {
    moments.push({ label: "책 속 한마디", text: reflection.favoriteQuote.trim() });
  }
  if (reflection.reviewContent?.trim()) {
    moments.push({ label: "감상", text: reflection.reviewContent.trim() });
  }
  if (reflection.reviewImpressiveScene?.trim()) {
    moments.push({ label: "인상 깊은 장면", text: reflection.reviewImpressiveScene.trim() });
  }
  if (reflection.reviewThoughts?.trim()) {
    moments.push({ label: "읽고 난 생각", text: reflection.reviewThoughts.trim() });
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
    const moments = buildMomentsFromReflection(reflection);
    if (!book && moments.length === 0) continue;

    reflectedBookIds.add(reflection.bookId);
    items.push({
      id: reflection.id,
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
    for (const moment of buildMomentsFromReflection(reflection)) {
      moments.push({
        label: bookTitle ? `${bookTitle} · ${moment.label}` : moment.label,
        text: moment.text,
      });
    }
  }
  return moments;
}
