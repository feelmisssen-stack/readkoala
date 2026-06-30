const STORAGE_PREFIX = "readkoala:quiz-solved:";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

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

export function writeQuizSolvedIds(userId: string, solvedIds: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...solvedIds]));
  } catch {
    // private browsing, quota, or blocked storage
  }
}

export function clearQuizSolvedIds(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
