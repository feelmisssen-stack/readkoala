import { getSession } from "./session";

export async function requireGoogleAdmin() {
  const session = await getSession();
  if (!session.googleAdminEmail) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function getGoogleAdminFromSession(session: {
  googleAdminEmail?: string;
  googleAdminName?: string;
}) {
  if (!session.googleAdminEmail) return null;
  return {
    email: session.googleAdminEmail,
    name: session.googleAdminName,
  };
}

/** 앱 화면(도란뜰 등)에서 관리자 기능을 보여 줄지: 관리자 앱 계정이거나 Google 관리자로 로그인한 경우 */
export function isAppAdminSession(session: { isAdmin?: boolean; googleAdminEmail?: string }) {
  return Boolean(session.isAdmin || session.googleAdminEmail);
}

/** 관리자가 앱 화면을 볼 때 닉네임 옆에 학생 번호를 괄호로 붙인다 */
export async function getDisplayNameOptions() {
  return { showStudentNumber: isAppAdminSession(await getSession()) };
}

export async function getGoogleAdmin() {
  const session = await getSession();
  return getGoogleAdminFromSession(session);
}
