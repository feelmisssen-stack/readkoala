import { getAllowedAdminEmails } from "@/lib/google-admin";

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
