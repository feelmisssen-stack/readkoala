import type { User } from "@/lib/types";
import { getDisplayName } from "@/lib/user-display";
import { calculateLevel } from "@/lib/gamification";
import {
  getFirestoreUser,
  listFirestoreUsers,
  type FirestoreUserProfile,
} from "@/lib/users/firestore-user";

export interface ResolvedAppUser {
  id: string;
  firebaseUid: string;
  username: string;
  nickname?: string;
  displayName: string;
  isAdmin: boolean;
  stats: User["stats"] & { level: number };
}

function profileToResolved(profile: FirestoreUserProfile & { id: string }): ResolvedAppUser {
  const effectiveId = profile.legacyDbId ?? profile.id;
  const level = calculateLevel(profile.stats);
  return {
    id: effectiveId,
    firebaseUid: profile.id,
    username: profile.username,
    nickname: profile.nickname,
    displayName: getDisplayName({
      username: profile.username,
      nickname: profile.nickname,
    }),
    isAdmin: profile.isAdmin,
    stats: { ...profile.stats, level },
  };
}

export async function resolveUserByFirebaseUid(firebaseUid: string): Promise<ResolvedAppUser | null> {
  const profile = await getFirestoreUser(firebaseUid);
  if (!profile) return null;
  return profileToResolved(profile);
}

export async function resolveUserBySession(input: {
  userId?: string;
  firebaseUid?: string;
}): Promise<ResolvedAppUser | null> {
  if (input.firebaseUid) {
    const fromFirebase = await resolveUserByFirebaseUid(input.firebaseUid);
    if (fromFirebase) return fromFirebase;
  }

  if (!input.userId) return null;

  const profiles = await listFirestoreUsers();
  const profile = profiles.find(
    (entry) => entry.id === input.userId || entry.legacyDbId === input.userId
  );
  if (!profile) return null;
  return profileToResolved(profile);
}
