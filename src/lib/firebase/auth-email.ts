export const AUTH_EMAIL_DOMAIN = "readkoala.local";

export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function authEmailToUsername(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  if (!normalized.endsWith(suffix)) return null;
  const username = normalized.slice(0, -suffix.length);
  return username || null;
}
