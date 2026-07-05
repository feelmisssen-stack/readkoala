import crypto from "crypto";
import { readDb } from "@/lib/db";
import { isAllowedAdminEmail } from "@/lib/google-admin";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import type { SessionData } from "@/lib/session";
import {
  USERS_COLLECTION,
  findFirestoreUserByEmail,
  getFirestoreUser,
  getFirestoreUserByUsername,
  resolveEffectiveUserId,
  type FirestoreUserProfile,
} from "@/lib/users/firestore-user";

function deriveUsernameFromGoogleEmail(email: string): string {
  return email.split("@")[0]?.trim().toLowerCase() ?? "admin";
}

export async function resolveAdminAppProfile(googleEmail: string) {
  const normalized = googleEmail.trim().toLowerCase();
  const byEmail = await findFirestoreUserByEmail(normalized);
  if (byEmail) return byEmail;

  const username = deriveUsernameFromGoogleEmail(normalized);
  if (username) {
    const byUsername = await getFirestoreUserByUsername(username);
    if (byUsername) return byUsername;
  }

  return null;
}

async function linkProfileToGoogleAdmin(
  profile: FirestoreUserProfile & { id: string },
  googleEmail: string
): Promise<FirestoreUserProfile & { id: string }> {
  const normalized = googleEmail.trim().toLowerCase();
  const updates: Partial<FirestoreUserProfile> = {};

  if (profile.email.trim().toLowerCase() !== normalized) {
    updates.email = normalized;
  }
  if (!profile.googleOnly) {
    updates.googleOnly = true;
  }
  if (!profile.isAdmin) {
    updates.isAdmin = true;
  }

  if (Object.keys(updates).length === 0) {
    return profile;
  }

  await getAdminFirestore().collection(USERS_COLLECTION).doc(profile.id).update(updates);
  return { ...profile, ...updates };
}

async function createGoogleAdminAppProfile(
  googleEmail: string,
  googleName?: string
): Promise<FirestoreUserProfile & { id: string }> {
  const normalized = googleEmail.trim().toLowerCase();
  const username = deriveUsernameFromGoogleEmail(normalized);
  const db = readDb();
  const legacyUser = db.users.find(
    (user) =>
      user.email?.trim().toLowerCase() === normalized ||
      user.username.trim().toLowerCase() === username
  );

  const auth = getAdminAuth();
  const randomPassword = crypto.randomBytes(24).toString("base64url");
  let uid: string;

  try {
    const userRecord = await auth.createUser({
      email: normalized,
      password: randomPassword,
      displayName: googleName?.trim() || legacyUser?.nickname || legacyUser?.username || username,
    });
    uid = userRecord.uid;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "auth/email-already-exists") {
      throw error;
    }
    uid = (await auth.getUserByEmail(normalized)).uid;
  }

  const existing = await getFirestoreUser(uid);
  if (existing) {
    return linkProfileToGoogleAdmin(existing, normalized);
  }

  const profile: FirestoreUserProfile = {
    username: legacyUser?.username ?? username,
    ...(legacyUser?.nickname || googleName?.trim()
      ? { nickname: legacyUser?.nickname ?? googleName?.trim() }
      : {}),
    email: normalized,
    isAdmin: true,
    googleOnly: true,
    createdAt: legacyUser?.createdAt ?? new Date().toISOString(),
    stats: legacyUser?.stats ?? {
      booksRead: 0,
      totalChars: 0,
      chatParticipations: 0,
      level: 1,
    },
    ...(legacyUser?.id ? { legacyDbId: legacyUser.id } : {}),
  };

  await getAdminFirestore().collection(USERS_COLLECTION).doc(uid).set(profile);
  return { id: uid, ...profile };
}

export async function ensureGoogleAdminAppProfile(googleEmail: string, googleName?: string) {
  const normalized = googleEmail.trim().toLowerCase();
  if (!isAllowedAdminEmail(normalized)) {
    throw new Error("관리자로 등록된 Google 계정이 아니에요.");
  }

  const existing = await resolveAdminAppProfile(normalized);
  if (existing) {
    return linkProfileToGoogleAdmin(existing, normalized);
  }

  return createGoogleAdminAppProfile(normalized, googleName);
}

export async function applyGoogleAdminAppSession(
  session: SessionData,
  googleEmail: string,
  googleName?: string
) {
  if (!isFirebaseAuthEnabled()) {
    return null;
  }

  const profile = await ensureGoogleAdminAppProfile(googleEmail, googleName);
  session.userId = resolveEffectiveUserId(profile, profile.id);
  session.firebaseUid = profile.id;
  session.username = profile.username;
  session.isAdmin = true;
  return profile;
}
