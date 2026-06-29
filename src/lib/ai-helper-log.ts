import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { buildUserDisplayMap } from "@/lib/user-display";
import type { AiHelperMessage } from "@/lib/types";

export function appendAiHelperExchange(input: {
  userId: string;
  bookId?: string;
  bookTitle?: string;
  userMessage?: string;
  assistantReply?: string;
}) {
  const now = new Date().toISOString();
  const newMessages: AiHelperMessage[] = [];
  if (input.userMessage?.trim()) {
    newMessages.push({ role: "user", content: input.userMessage.trim(), createdAt: now });
  }
  if (input.assistantReply?.trim()) {
    newMessages.push({
      role: "assistant",
      content: input.assistantReply.trim(),
      createdAt: now,
    });
  }
  if (newMessages.length === 0) return;

  updateDb((db) => {
    const existing = db.aiHelperSessions.find(
      (session) =>
        session.userId === input.userId &&
        (input.bookId ? session.bookId === input.bookId : session.bookTitle === input.bookTitle)
    );

    if (existing) {
      existing.messages.push(...newMessages);
      existing.updatedAt = now;
      if (input.bookTitle) existing.bookTitle = input.bookTitle;
      return;
    }

    db.aiHelperSessions.push({
      id: uuid(),
      userId: input.userId,
      bookId: input.bookId,
      bookTitle: input.bookTitle,
      messages: newMessages,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export function listAiHelperSessionsForAdmin() {
  const db = readDb();
  const displayMap = buildUserDisplayMap(db.users);

  return db.aiHelperSessions
    .map((session) => {
      const user = db.users.find((u) => u.id === session.userId);
      const book = session.bookId
        ? db.books.find((b) => b.id === session.bookId)
        : undefined;
      return {
        ...session,
        username: user?.username || "알 수 없음",
        nickname: displayMap.get(session.userId) || user?.username || "친구",
        bookTitle: session.bookTitle || book?.title,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
