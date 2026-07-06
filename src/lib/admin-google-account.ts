import { getAllowedAdminEmails } from "@/lib/google-admin";

/** Google 관리자 앱 계정 아이디 (화면·세션 표시용) */
export const GOOGLE_ADMIN_USERNAME = "admin";

export function isGoogleAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAllowedAdminEmails().includes(email.trim().toLowerCase());
}

export function isGoogleOnlyLoginUser(input: {
  email?: string | null;
  googleOnly?: boolean;
}): boolean {
  if (input.googleOnly) return true;
  return isGoogleAdminEmail(input.email);
}
