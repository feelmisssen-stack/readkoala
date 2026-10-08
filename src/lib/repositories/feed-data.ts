import type { Database, User } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { listAllBooks } from "@/lib/repositories/books-repository";
import {
  listAllReflections,
  listReflectionsByUserId,
} from "@/lib/repositories/reflections-repository";
import {
  listAllSharedSentences,
  listSharedSentencesByUserId,
} from "@/lib/repositories/shared-sentences-repository";
import {
  listFirestoreUsers,
  resolveEffectiveUserId,
  USERS_COLLECTION,
  type FirestoreUserProfile,
} from "@/lib/users/firestore-user";

/** 홈 피드 한 쪽에 보여 줄 책 수 */
export const HOME_FEED_PAGE_SIZE = 12;

/** 쪽을 넘길 때마다 책·감상 전체를 다시 읽지 않도록 서버 메모리에 잠시 보관 */
const HOME_FEED_CACHE_MS = 60 * 1000;
let homeFeedCache: {
  loadedAt: number;
  data: Promise<Pick<Database, "books" | "reflections">>;
} | null = null;

function profileToUser(profile: FirestoreUserProfile & { id: string }): User {
  return {
    id: resolveEffectiveUserId(profile, profile.id),
    username: profile.username,
    nickname: profile.nickname,
    passwordHash: "",
    isAdmin: profile.isAdmin,
    createdAt: profile.createdAt,
    stats: profile.stats,
  };
}

export async function listUsersForIds(userIds: string[]): Promise<User[]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const db = getAdminFirestore();
  const usersById = new Map<string, User>();

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const refs = chunk.map((id) => db.collection(USERS_COLLECTION).doc(id));
    const docs = await db.getAll(...refs);
    for (const doc of docs) {
      if (!doc.exists) continue;
      const profile = {
        id: doc.id,
        username: String(doc.data()!.username),
        nickname: doc.data()!.nickname ? String(doc.data()!.nickname) : undefined,
        email: String(doc.data()!.email ?? ""),
        isAdmin: Boolean(doc.data()!.isAdmin),
        readOnly: Boolean(doc.data()!.readOnly),
        createdAt: String(doc.data()!.createdAt),
        stats: doc.data()!.stats as FirestoreUserProfile["stats"],
        legacyDbId: doc.data()!.legacyDbId ? String(doc.data()!.legacyDbId) : undefined,
        googleOnly: Boolean(doc.data()!.googleOnly),
      } satisfies FirestoreUserProfile & { id: string };
      const user = profileToUser(profile);
      usersById.set(user.id, user);
    }
  }

  const missing = unique.filter((id) => !usersById.has(id));
  for (let i = 0; i < missing.length; i += 30) {
    const chunk = missing.slice(i, i + 30);
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .where("legacyDbId", "in", chunk)
      .get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const profile = {
        id: doc.id,
        username: String(data.username),
        nickname: data.nickname ? String(data.nickname) : undefined,
        email: String(data.email ?? ""),
        isAdmin: Boolean(data.isAdmin),
        readOnly: Boolean(data.readOnly),
        createdAt: String(data.createdAt),
        stats: data.stats as FirestoreUserProfile["stats"],
        legacyDbId: data.legacyDbId ? String(data.legacyDbId) : undefined,
        googleOnly: Boolean(data.googleOnly),
      } satisfies FirestoreUserProfile & { id: string };
      const user = profileToUser(profile);
      usersById.set(user.id, user);
    }
  }

  return unique.map((id) => usersById.get(id)).filter((user): user is User => Boolean(user));
}

/** 홈 피드 전용 — 모든 책·감상 (sharedSentences·users 제외), 60초 캐시 */
export function loadHomeFeedSource(): Promise<Pick<Database, "books" | "reflections">> {
  const now = Date.now();
  if (!homeFeedCache || now - homeFeedCache.loadedAt > HOME_FEED_CACHE_MS) {
    const data = Promise.all([listAllBooks(), listAllReflections()]).then(
      ([books, reflections]) => ({ books, reflections })
    );
    homeFeedCache = { loadedAt: now, data };
    data.catch(() => {
      if (homeFeedCache?.data === data) homeFeedCache = null;
    });
  }
  return homeFeedCache.data;
}

export async function loadFeedDatabase(): Promise<
  Pick<Database, "books" | "reflections" | "users" | "sharedSentences">
> {
  const [books, reflections, firestoreUsers, sharedSentences] = await Promise.all([
    listAllBooks(),
    listAllReflections(),
    listFirestoreUsers(),
    listAllSharedSentences(),
  ]);

  const users: User[] = firestoreUsers.map((profile) => ({
    id: resolveEffectiveUserId(profile, profile.id),
    username: profile.username,
    nickname: profile.nickname,
    passwordHash: "",
    isAdmin: profile.isAdmin,
    createdAt: profile.createdAt,
    stats: profile.stats,
  }));

  return { books, reflections, users, sharedSentences };
}

export async function loadWritingGrowthDatabase(
  userId: string
): Promise<Pick<Database, "reflections" | "sharedSentences">> {
  const [reflections, sharedSentences] = await Promise.all([
    listReflectionsByUserId(userId),
    listSharedSentencesByUserId(userId),
  ]);

  return { reflections, sharedSentences };
}
