import { v4 as uuid } from "uuid";
import type { VocabularyEntry } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "vocabulary";

function sortByCreatedAt(entries: VocabularyEntry[]) {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function entryKey(word: string, definition: string) {
  return `${word.trim()}::${definition || ""}`;
}

export async function listVocabularyByUserId(userId: string): Promise<VocabularyEntry[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  return sortByCreatedAt(
    snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<VocabularyEntry, "id">) }))
  );
}

export async function createVocabularyEntry(
  input: Omit<VocabularyEntry, "id" | "createdAt"> & { id?: string }
): Promise<VocabularyEntry> {
  const existing = await listVocabularyByUserId(input.userId);
  const trimmedWord = input.word.trim();
  const trimmedDef = input.definition || "";
  const duplicate = existing.some(
    (entry) => entry.word === trimmedWord && entry.definition === trimmedDef
  );
  if (duplicate) {
    throw new Error("DUPLICATE_ENTRY");
  }

  const entry: VocabularyEntry = {
    id: input.id ?? uuid(),
    userId: input.userId,
    word: trimmedWord,
    definition: trimmedDef,
    ...(input.senseNo && input.senseNo > 0 ? { senseNo: input.senseNo } : {}),
    createdAt: new Date().toISOString(),
  };

  const { id, ...payload } = entry;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
  return entry;
}

export async function importVocabularyEntries(
  userId: string,
  entries: VocabularyEntry[]
): Promise<VocabularyEntry[]> {
  const existing = await listVocabularyByUserId(userId);
  const existingIds = new Set(existing.map((entry) => entry.id));
  const existingKeys = new Set(existing.map((entry) => entryKey(entry.word, entry.definition)));

  const db = getAdminFirestore();
  let batch = db.batch();
  let writes = 0;

  for (const raw of entries) {
    if (raw.userId !== userId) continue;

    const word = raw.word.trim();
    const definition = raw.definition || "";
    if (!word) continue;

    const key = entryKey(word, definition);
    if (existingKeys.has(key)) continue;

    const entry: VocabularyEntry = {
      id: raw.id && !existingIds.has(raw.id) ? raw.id : uuid(),
      userId,
      word,
      definition,
      ...(raw.senseNo && raw.senseNo > 0 ? { senseNo: raw.senseNo } : {}),
      createdAt: raw.createdAt || new Date().toISOString(),
    };

    existingKeys.add(key);
    existingIds.add(entry.id);

    const { id, ...payload } = entry;
    batch.set(db.collection(COLLECTION).doc(id), serializeForFirestore(payload));
    writes += 1;

    if (writes >= 400) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }

  if (writes > 0) {
    await batch.commit();
  }

  return listVocabularyByUserId(userId);
}

export async function deleteVocabularyEntryForUser(
  entryId: string,
  userId: string
): Promise<boolean> {
  const doc = await getAdminFirestore().collection(COLLECTION).doc(entryId).get();
  if (!doc.exists) return false;
  const data = doc.data() as Omit<VocabularyEntry, "id">;
  if (data.userId !== userId) return false;
  await doc.ref.delete();
  return true;
}

export async function deleteVocabularyForUser(userId: string): Promise<void> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
