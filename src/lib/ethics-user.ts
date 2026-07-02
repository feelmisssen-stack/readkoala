import { getAdminFirestore } from "@/lib/firebase/admin";
import { USERS_COLLECTION } from "@/lib/users/firestore-user";

export interface UserEthicsState {
  aiHelperAckCount: number;
  firstCopyCompletedAt?: string;
  lastAckAt?: string;
}

function parseEthicsState(data: Record<string, unknown> | undefined): UserEthicsState {
  const ethics = data?.ethics as Record<string, unknown> | undefined;
  return {
    aiHelperAckCount: Number(ethics?.aiHelperAckCount ?? 0),
    firstCopyCompletedAt: ethics?.firstCopyCompletedAt
      ? String(ethics.firstCopyCompletedAt)
      : undefined,
    lastAckAt: ethics?.lastAckAt ? String(ethics.lastAckAt) : undefined,
  };
}

export async function getUserEthicsState(firebaseUid: string) {
  const doc = await getAdminFirestore().collection(USERS_COLLECTION).doc(firebaseUid).get();
  if (!doc.exists) return null;
  return parseEthicsState(doc.data());
}

export async function recordEthicsAcknowledgement(
  firebaseUid: string,
  input: { mode: "copy" | "simple" }
) {
  const ref = getAdminFirestore().collection(USERS_COLLECTION).doc(firebaseUid);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const current = parseEthicsState(doc.data());
  const now = new Date().toISOString();
  const nextCount = current.aiHelperAckCount + 1;

  await ref.update({
    ethics: {
      aiHelperAckCount: nextCount,
      lastAckAt: now,
      ...(input.mode === "copy"
        ? { firstCopyCompletedAt: now }
        : current.firstCopyCompletedAt
          ? { firstCopyCompletedAt: current.firstCopyCompletedAt }
          : {}),
    },
  });

  return {
    aiHelperAckCount: nextCount,
    lastAckAt: now,
  };
}

export async function recordEthicsSkippedUse(firebaseUid: string) {
  const ref = getAdminFirestore().collection(USERS_COLLECTION).doc(firebaseUid);
  const doc = await ref.get();
  if (!doc.exists) {
    throw new Error("USER_NOT_FOUND");
  }

  const current = parseEthicsState(doc.data());
  const now = new Date().toISOString();
  const nextCount = current.aiHelperAckCount + 1;

  await ref.update({
    ethics: {
      aiHelperAckCount: nextCount,
      lastAckAt: now,
      ...(current.firstCopyCompletedAt ? { firstCopyCompletedAt: current.firstCopyCompletedAt } : {}),
    },
  });

  return nextCount;
}
