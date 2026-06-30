import { v4 as uuid } from "uuid";
import type { Reflection } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "reflections";

function sortByCreatedAt(reflections: Reflection[]) {
  return [...reflections].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function listReflectionsByUserId(
  userId: string,
  bookId?: string
): Promise<Reflection[]> {
  let query = getAdminFirestore().collection(COLLECTION).where("userId", "==", userId);
  if (bookId) {
    query = query.where("bookId", "==", bookId);
  }

  const snapshot = await query.get();
  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Reflection, "id">) }))
  );
}

export async function listAllReflections(): Promise<Reflection[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Reflection, "id">) }));
}

export async function getReflectionById(reflectionId: string): Promise<Reflection | null> {
  const doc = await getAdminFirestore().collection(COLLECTION).doc(reflectionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<Reflection, "id">) };
}

export async function getReflectionByUserAndBook(
  userId: string,
  bookId: string
): Promise<Reflection | null> {
  const reflections = await listReflectionsByUserId(userId, bookId);
  return reflections[0] ?? null;
}

export async function getReflectionByBookId(bookId: string): Promise<Reflection | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("bookId", "==", bookId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<Reflection, "id">) };
}

export async function saveReflection(reflection: Reflection): Promise<Reflection> {
  const { id, ...payload } = reflection;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
  return reflection;
}

export async function deleteReflectionsForBook(bookId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("bookId", "==", bookId)
    .get();

  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  if (!snapshot.empty) await batch.commit();
}

export async function deleteReflectionsForUser(userId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export function createEmptyReflection(userId: string, bookId: string, now: string): Reflection {
  return {
    id: uuid(),
    userId,
    bookId,
    beforeReading: [],
    duringReading: [],
    association: "",
    favoriteQuote: "",
    reviewTitle: "",
    reviewReason: "",
    reviewContent: "",
    reviewImpressiveScene: "",
    reviewThoughts: "",
    createdAt: now,
    updatedAt: now,
  };
}
