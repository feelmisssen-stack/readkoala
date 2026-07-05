import type { SessionData } from "@/lib/session";
import type { FirestoreUserProfile } from "@/lib/users/firestore-user";

/** Firestore `readOnly` 없이도 뷰어계정으로 취급할 아이디 */
export const READ_ONLY_USERNAMES = ["tester"] as const;

export const READ_ONLY_MESSAGE =
  "뷰어계정이라 저장·등록·수정·삭제할 수 없어요.";

export function isReadOnlyUsername(username: string | undefined) {
  if (!username) return false;
  const normalized = username.trim().toLowerCase();
  return (READ_ONLY_USERNAMES as readonly string[]).includes(normalized);
}

export function isReadOnlyProfile(profile: Pick<FirestoreUserProfile, "username" | "readOnly">) {
  if (profile.readOnly) return true;
  return isReadOnlyUsername(profile.username);
}

export function resolveSessionReadOnly(input: {
  username?: string;
  readOnly?: boolean;
}) {
  if (input.readOnly) return true;
  return isReadOnlyUsername(input.username);
}

export function applyReadOnlyToSession(
  session: SessionData,
  profile: Pick<FirestoreUserProfile, "username" | "readOnly">
) {
  session.readOnly = resolveSessionReadOnly({
    username: profile.username,
    readOnly: profile.readOnly,
  });
}
