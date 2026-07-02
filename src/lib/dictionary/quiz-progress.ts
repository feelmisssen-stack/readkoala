const STORAGE_PREFIX = "readkoala:quiz-solved:";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

/** @deprecated Firestore 이전 시 1회 마이그레이션용 */
export function readQuizSolvedIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

/** @deprecated Firestore 이전 후 사용하지 않음 */
export function writeQuizSolvedIds(userId: string, solvedIds: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...solvedIds]));
  } catch {
    // private browsing, quota, or blocked storage
  }
}

/** @deprecated Firestore 이전 후 사용하지 않음 */
export function clearQuizSolvedIds(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

export function clearLocalQuizSolvedIds(userId: string) {
  clearQuizSolvedIds(userId);
}
