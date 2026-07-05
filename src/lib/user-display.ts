import type { User } from "./types";
import { isReadOnlyUsername, VIEWER_ACCOUNT_NICKNAME } from "./read-only-access";

export function getDisplayName(user: Pick<User, "username" | "nickname">): string {
  if (isReadOnlyUsername(user.username)) {
    return VIEWER_ACCOUNT_NICKNAME;
  }
  const nick = user.nickname?.trim();
  return nick || user.username;
}

export function buildUserDisplayMap(users: User[]): Map<string, string> {
  return new Map(users.map((u) => [u.id, getDisplayName(u)]));
}

export function findUserByEmail(users: User[], email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email?.trim().toLowerCase() === normalized);
}
