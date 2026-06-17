import type { Database, RandomFeedItem, Reflection } from "./types";

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
