import type { User } from "./types";

export function getDisplayName(user: Pick<User, "username" | "nickname">): string {
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
