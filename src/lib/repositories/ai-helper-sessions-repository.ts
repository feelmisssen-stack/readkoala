import { v4 as uuid } from "uuid";
import type { AiHelperMessage, AiHelperSession } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { buildUserDisplayMap } from "@/lib/user-display";
import { serializeForFirestore } from "@/lib/repositories/data-mode";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";

const COLLECTION = "aiHelperSessions";

function buildNewMessages(input: {
  userMessage?: string;
  assistantReply?: string;
}): AiHelperMessage[] {
  const now = new Date().toISOString();
  const messages: AiHelperMessage[] = [];
  if (input.userMessage?.trim()) {
    messages.push({ role: "user", content: input.userMessage.trim(), createdAt: now });
  }
  if (input.assistantReply?.trim()) {
    messages.push({
      role: "assistant",
      content: input.assistantReply.trim(),
      createdAt: now,
    });
  }
  return messages;
}

function matchesSession(
  session: AiHelperSession,
  userId: string,
  bookId?: string,
  bookTitle?: string
) {
  if (session.userId !== userId) return false;
  if (bookId) return session.bookId === bookId;
  return session.bookTitle === bookTitle;
}

export async function appendAiHelperExchange(input: {
  userId: string;
  bookId?: string;
  bookTitle?: string;
  userMessage?: string;
  assistantReply?: string;
}) {
  const newMessages = buildNewMessages(input);
  if (newMessages.length === 0) return;

  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).where("userId", "==", input.userId).get();
  const existingDoc = snapshot.docs.find((doc) => {
    const session = { id: doc.id, ...(doc.data() as Omit<AiHelperSession, "id">) };
    return matchesSession(session, input.userId, input.bookId, input.bookTitle);
  });

  if (existingDoc) {
    const data = existingDoc.data() as Omit<AiHelperSession, "id">;
    await existingDoc.ref.update({
      messages: [...data.messages, ...newMessages],
      updatedAt: now,
      ...(input.bookTitle ? { bookTitle: input.bookTitle } : {}),
    });
    return;
  }

  const session: AiHelperSession = {
    id: uuid(),
    userId: input.userId,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    messages: newMessages,
    createdAt: now,
    updatedAt: now,
  };
  const { id, ...payload } = session;
  await db.collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
}

export async function listAiHelperSessionsForAdmin() {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();
  const sessions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AiHelperSession, "id">),
  }));

  const feedData = await loadFeedDatabase();
  const displayMap = buildUserDisplayMap(feedData.users);

  return sessions
    .map((session) => {
      const user = feedData.users.find((entry) => entry.id === session.userId);
      const book = session.bookId
        ? feedData.books.find((entry) => entry.id === session.bookId)
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

export async function deleteAiHelperSessionsForUser(userId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
