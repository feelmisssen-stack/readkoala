import type { Database, User } from "@/lib/types";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  getBooksByIds,
  listAllBooks,
  listRecentBooks,
} from "@/lib/repositories/books-repository";
import {
  listAllReflections,
  listRecentReflections,
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

/** 홈 피드 모자이크에 표시할 최대 카드 수 */
export const CAROUSEL_FEED_LIMIT = 72;

/** exclude 필터 후에도 충분한 후보를 확보하기 위한 조회 상한 */
const CAROUSEL_FETCH_LIMIT = CAROUSEL_FEED_LIMIT * 2;

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

async function listUsersForIds(userIds: string[]): Promise<User[]> {
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

function collectFeedUserIds(
  books: Database["books"],
  reflections: Database["reflections"],
  extraUserId?: string
) {
  const userIds = new Set<string>();
  for (const book of books) userIds.add(book.userId);
  for (const reflection of reflections) userIds.add(reflection.userId);
  if (extraUserId) userIds.add(extraUserId);
  return [...userIds];
}

/** 홈 캐러셀 전용 — 최근 책·감상만 조회하고 sharedSentences는 생략 */
export async function loadCarouselFeedDatabase(extraUserId?: string): Promise<
  Pick<Database, "books" | "reflections" | "users">
> {
  const [books, reflections] = await Promise.all([
    listRecentBooks(CAROUSEL_FETCH_LIMIT),
    listRecentReflections(CAROUSEL_FETCH_LIMIT),
  ]);

  const users = await listUsersForIds(collectFeedUserIds(books, reflections, extraUserId));

  return { books, reflections, users };
}

/** 내 기록 오버레이용 — 해당 사용자 데이터만 조회 */
export async function loadPersonalCarouselDatabase(userId: string): Promise<
  Pick<Database, "books" | "reflections" | "users">
> {
  const reflections = await listReflectionsByUserId(userId);
  const books = await getBooksByIds(reflections.map((reflection) => reflection.bookId));
  const users = await listUsersForIds([userId]);

  return { books, reflections, users };
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
