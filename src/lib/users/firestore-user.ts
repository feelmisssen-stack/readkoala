import type { UserStats } from "@/lib/types";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { usernameToAuthEmail } from "@/lib/firebase/auth-email";

export interface FirestoreUserProfile {
  username: string;
  nickname?: string;
  email: string;
  isAdmin: boolean;
  /** 뷰어계정: 탐색·작성 화면 접근 가능, 저장·수정·삭제 불가 */
  readOnly?: boolean;
  createdAt: string;
  stats: UserStats;
  legacyDbId?: string;
  googleOnly?: boolean;
}

export const USERS_COLLECTION = "users";

function docToProfile(uid: string, data: Record<string, unknown>): FirestoreUserProfile & { id: string } {
  return {
    id: uid,
    username: String(data.username),
    nickname: data.nickname ? String(data.nickname) : undefined,
    email: String(data.email),
    isAdmin: Boolean(data.isAdmin),
    readOnly: Boolean(data.readOnly),
    createdAt: String(data.createdAt),
    stats: data.stats as UserStats,
    legacyDbId: data.legacyDbId ? String(data.legacyDbId) : undefined,
    googleOnly: Boolean(data.googleOnly),
  };
}

export function resolveEffectiveUserId(profile: Pick<FirestoreUserProfile, "legacyDbId">, uid: string) {
  return profile.legacyDbId ?? uid;
}

export async function listFirestoreUsers() {
  const snapshot = await getAdminFirestore().collection(USERS_COLLECTION).get();
  return snapshot.docs.map((doc) => docToProfile(doc.id, doc.data()));
}

export async function getFirestoreUser(uid: string) {
  const doc = await getAdminFirestore().collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return docToProfile(doc.id, doc.data()!);
}

export async function getFirestoreUserByUsername(username: string) {
  const snapshot = await getAdminFirestore()
    .collection(USERS_COLLECTION)
    .where("username", "==", username.trim())
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0]!;
  return docToProfile(doc.id, doc.data());
}

export async function findFirestoreUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const snapshot = await getAdminFirestore().collection(USERS_COLLECTION).get();
  return (
    snapshot.docs
      .map((doc) => docToProfile(doc.id, doc.data()))
      .find((profile) => profile.email.trim().toLowerCase() === normalized) ?? null
  );
}

export async function createFirestoreUser(input: {
  username: string;
  password: string;
  nickname?: string;
  legacyDbId?: string;
  isAdmin?: boolean;
  stats?: UserStats;
}) {
  const trimmedUsername = input.username.trim();
  const email = usernameToAuthEmail(trimmedUsername);
  const existing = await getFirestoreUserByUsername(trimmedUsername);
  if (existing) {
    throw new Error("이미 사용 중인 아이디예요.");
  }

  const auth = getAdminAuth();
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: input.password,
      displayName: input.nickname?.trim() || trimmedUsername,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "auth/email-already-exists") {
      throw new Error("이미 사용 중인 아이디예요.");
    }
    throw error;
  }

  const profile: FirestoreUserProfile = {
    username: trimmedUsername,
    ...(input.nickname?.trim() ? { nickname: input.nickname.trim() } : {}),
    email,
    isAdmin: input.isAdmin ?? false,
    createdAt: new Date().toISOString(),
    stats: input.stats ?? { booksRead: 0, totalChars: 0, chatParticipations: 0, level: 1 },
    ...(input.legacyDbId ? { legacyDbId: input.legacyDbId } : {}),
  };

  await getAdminFirestore().collection(USERS_COLLECTION).doc(userRecord.uid).set(profile);

  return {
    uid: userRecord.uid,
    profile,
  };
}

export async function updateFirestoreUserPassword(uid: string, password: string) {
  await getAdminAuth().updateUser(uid, { password });
}

export async function updateFirestoreUserNickname(uid: string, nickname: string) {
  await getAdminFirestore().collection(USERS_COLLECTION).doc(uid).update({ nickname });
}

export async function deleteFirestoreUser(uid: string) {
  await getAdminAuth().deleteUser(uid);
  await getAdminFirestore().collection(USERS_COLLECTION).doc(uid).delete();
}
