import type { VocabularyEntry } from "@/lib/types";

const STORAGE_PREFIX = "readkoala:vocabulary:";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function createEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function sortEntries(entries: VocabularyEntry[]) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.createdAt ?? 0).getTime();
    const bTime = new Date(b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export function readLocalVocabulary(userId: string): VocabularyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortEntries(parsed as VocabularyEntry[]);
  } catch {
    return [];
  }
}

export function writeLocalVocabulary(userId: string, entries: VocabularyEntry[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(sortEntries(entries)));
  } catch {
    // private browsing, quota, or blocked storage
  }
}

export function addLocalVocabularyEntry(
  userId: string,
  input: Omit<VocabularyEntry, "id" | "userId" | "createdAt">
): VocabularyEntry {
  const entries = readLocalVocabulary(userId);
  const trimmedDef = input.definition || "";
  const exists = entries.some(
    (entry) => entry.word === input.word.trim() && entry.definition === trimmedDef
  );
  if (exists) {
    throw new Error("이미 낱말집에 있는 뜻이에요.");
  }

  const entry: VocabularyEntry = {
    id: createEntryId(),
    userId,
    word: input.word.trim(),
    definition: trimmedDef,
    ...(input.senseNo && input.senseNo > 0 ? { senseNo: input.senseNo } : {}),
    createdAt: new Date().toISOString(),
  };

  writeLocalVocabulary(userId, [...entries, entry]);
  return entry;
}

export function deleteLocalVocabularyEntry(userId: string, entryId: string): boolean {
  const entries = readLocalVocabulary(userId);
  const next = entries.filter((entry) => entry.id !== entryId);
  if (next.length === entries.length) return false;
  writeLocalVocabulary(userId, next);
  return true;
}

export function importLegacyVocabulary(userId: string, legacy: VocabularyEntry[]) {
  if (readLocalVocabulary(userId).length > 0 || legacy.length === 0) return;
  writeLocalVocabulary(userId, legacy.filter((entry) => entry.userId === userId));
}
