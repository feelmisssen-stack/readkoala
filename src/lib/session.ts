import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { sessionOptions } from "@/lib/session-options";

export type { SessionOptions } from "iron-session";
export { sessionOptions } from "@/lib/session-options";

export interface SessionData {
  userId?: string;
  firebaseUid?: string;
  username?: string;
  isAdmin?: boolean;
  /** 뷰어계정: 화면 탐색은 가능, 데이터 저장·수정 불가 */
  readOnly?: boolean;
  googleAdminEmail?: string;
  googleAdminName?: string;
  /** 이번 로그인 세션에서 감상문 도우미 윤리 안내를 완료했는지 */
  aiHelperEthicsAckedAt?: string;
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** OAuth 리다이렉트 등 응답 객체에 세션 쿠키를 직접 싣을 때 사용 */
export async function getSessionForResponse(request: Request, response: NextResponse) {
  return getIronSession<SessionData>(request, response, sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
