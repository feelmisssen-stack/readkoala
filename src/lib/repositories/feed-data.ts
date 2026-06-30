import type { Database, User } from "@/lib/types";
import { listAllBooks } from "@/lib/repositories/books-repository";
import { listAllReflections, listReflectionsByUserId } from "@/lib/repositories/reflections-repository";
import {
  listAllSharedSentences,
  listSharedSentencesByUserId,
} from "@/lib/repositories/shared-sentences-repository";
import { listFirestoreUsers, resolveEffectiveUserId } from "@/lib/users/firestore-user";

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
