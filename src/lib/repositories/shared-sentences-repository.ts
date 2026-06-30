import { v4 as uuid } from "uuid";
import type { SharedSentence } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "sharedSentences";

function sortByCreatedAt(sentences: SharedSentence[]) {
  return [...sentences].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function listAllSharedSentences(): Promise<SharedSentence[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();
  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SharedSentence, "id">) }))
  );
}

export async function listSharedSentencesByUserId(userId: string): Promise<SharedSentence[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SharedSentence, "id">) }))
  );
}

export async function createSharedSentence(
  input: Omit<SharedSentence, "id" | "createdAt"> & { id?: string }
): Promise<SharedSentence> {
  const sentence: SharedSentence = {
    id: input.id ?? uuid(),
    userId: input.userId,
    username: input.username,
    vocabularyId: input.vocabularyId,
    word: input.word,
    definition: input.definition || "",
    ...(input.senseNo ? { senseNo: input.senseNo } : {}),
    sentence: input.sentence.trim(),
    createdAt: new Date().toISOString(),
  };

  const { id, ...payload } = sentence;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
  return sentence;
}

export async function deleteSharedSentenceForUser(
  sentenceId: string,
  userId: string
): Promise<boolean> {
  const doc = await getAdminFirestore().collection(COLLECTION).doc(sentenceId).get();
  if (!doc.exists) return false;
  const data = doc.data() as Omit<SharedSentence, "id">;
  if (data.userId !== userId) return false;
  await doc.ref.delete();
  return true;
}

export async function deleteSharedSentencesForUser(userId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
