import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "vocabularyQuizProgress";

function normalizeSolvedIds(solvedIds: string[]) {
  return [...new Set(solvedIds.filter((id) => typeof id === "string" && id.trim()))];
}

export async function getQuizSolvedIds(userId: string): Promise<string[]> {
  const doc = await getAdminFirestore().collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return [];
  const data = doc.data() as { solvedIds?: unknown } | undefined;
  if (!Array.isArray(data?.solvedIds)) return [];
  return normalizeSolvedIds(data.solvedIds as string[]);
}

export async function saveQuizSolvedIds(userId: string, solvedIds: string[]) {
  const normalized = normalizeSolvedIds(solvedIds);
  await getAdminFirestore()
    .collection(COLLECTION)
    .doc(userId)
    .set(
      serializeForFirestore({
        userId,
        solvedIds: normalized,
        updatedAt: new Date().toISOString(),
      })
    );
}

export async function deleteQuizProgressForUser(userId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTION).doc(userId).delete();
}
