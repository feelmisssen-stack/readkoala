import type { User } from "./types";
import { isReadOnlyUsername, VIEWER_ACCOUNT_NICKNAME } from "./read-only-access";

export interface DisplayNameOptions {
  /** 관리자 화면에서만 켠다. 아이디가 숫자(학생 번호)인 경우 "닉네임 (61)"처럼 붙인다 */
  showStudentNumber?: boolean;
}

export function getDisplayName(
  user: Pick<User, "username" | "nickname">,
  options?: DisplayNameOptions
): string {
  if (isReadOnlyUsername(user.username)) {
    return VIEWER_ACCOUNT_NICKNAME;
  }
  const name = user.nickname?.trim() || user.username;
  if (options?.showStudentNumber && /^\d+$/.test(user.username) && name !== user.username) {
    return `${name} (${user.username})`;
  }
  return name;
}

export function buildUserDisplayMap(users: User[], options?: DisplayNameOptions): Map<string, string> {
  return new Map(users.map((u) => [u.id, getDisplayName(u, options)]));
}

export function findUserByEmail(users: User[], email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email?.trim().toLowerCase() === normalized);
}
