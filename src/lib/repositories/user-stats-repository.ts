import { calculateLevel } from "@/lib/gamification";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { countCompletedBooksForUser } from "@/lib/repositories/books-repository";
import type { UserStats } from "@/lib/types";

async function updateFirestoreUserStats(firebaseUid: string, stats: Partial<UserStats>) {
  const updates: Record<string, number> = {};
  if (stats.booksRead !== undefined) updates["stats.booksRead"] = stats.booksRead;
  if (stats.totalChars !== undefined) updates["stats.totalChars"] = stats.totalChars;
  if (stats.chatParticipations !== undefined) {
    updates["stats.chatParticipations"] = stats.chatParticipations;
  }
  if (stats.level !== undefined) updates["stats.level"] = stats.level;

  if (Object.keys(updates).length === 0) return;
  await getAdminFirestore().collection("users").doc(firebaseUid).update(updates);
}

export async function addReflectionChars(
  _userId: string,
  charCount: number,
  firebaseUid?: string
) {
  if (charCount <= 0 || !firebaseUid) return;

  const doc = await getAdminFirestore().collection("users").doc(firebaseUid).get();
  const stats = doc.data()?.stats as UserStats | undefined;
  if (!stats) return;

  const totalChars = stats.totalChars + charCount;
  const level = calculateLevel({
    booksRead: stats.booksRead,
    totalChars,
    chatParticipations: stats.chatParticipations,
    level: 1,
  });
  await updateFirestoreUserStats(firebaseUid, { totalChars, level });
}

export async function syncBooksReadStat(_userId: string, firebaseUid?: string) {
  if (!firebaseUid) return;

  const profile = await getAdminFirestore().collection("users").doc(firebaseUid).get();
  const legacyDbId = profile.data()?.legacyDbId as string | undefined;
  const effectiveUserId = legacyDbId ?? firebaseUid;
  const booksRead = await countCompletedBooksForUser(effectiveUserId);
  await updateFirestoreUserStats(firebaseUid, { booksRead });
}

export async function incrementChatParticipation(_userId: string, firebaseUid?: string) {
  if (!firebaseUid) return;

  const doc = await getAdminFirestore().collection("users").doc(firebaseUid).get();
  const stats = doc.data()?.stats as UserStats | undefined;
  if (!stats) return;

  const chatParticipations = stats.chatParticipations + 1;
  const level = calculateLevel({
    booksRead: stats.booksRead,
    totalChars: stats.totalChars,
    chatParticipations,
    level: 1,
  });
  await updateFirestoreUserStats(firebaseUid, { chatParticipations, level });
}
