import { v4 as uuid } from "uuid";
import type { StoryEmpathy } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "storyEmpathies";

export async function listStoryEmpathiesByBookId(bookId: string): Promise<StoryEmpathy[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("bookId", "==", bookId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StoryEmpathy, "id">),
  }));
}

export async function upsertStoryEmpathy(input: {
  bookId: string;
  storyId: string;
  authorUserId: string;
  voterUserId: string;
  heartCount: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).where("bookId", "==", input.bookId).get();
  const existingDoc = snapshot.docs.find((doc) => doc.data().voterUserId === input.voterUserId);

  if (existingDoc) {
    await existingDoc.ref.update({
      heartCount: input.heartCount,
      storyId: input.storyId,
      updatedAt: now,
    });
    return;
  }

  if (input.heartCount === 0) return;

  const record: StoryEmpathy = {
    id: uuid(),
    storyId: input.storyId,
    bookId: input.bookId,
    authorUserId: input.authorUserId,
    voterUserId: input.voterUserId,
    heartCount: input.heartCount,
    createdAt: now,
    updatedAt: now,
  };
  const { id, ...payload } = record;
  await db.collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
}

export async function deleteStoryEmpathiesForBook(bookId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("bookId", "==", bookId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function deleteStoryEmpathiesForUser(userId: string): Promise<void> {
  const db = getAdminFirestore();
  const [asAuthor, asVoter] = await Promise.all([
    db.collection(COLLECTION).where("authorUserId", "==", userId).get(),
    db.collection(COLLECTION).where("voterUserId", "==", userId).get(),
  ]);

  const docsToDelete = [...asAuthor.docs, ...asVoter.docs];
  if (docsToDelete.length === 0) return;

  const seen = new Set<string>();
  const batch = db.batch();
  for (const doc of docsToDelete) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    batch.delete(doc.ref);
  }
  await batch.commit();
}
