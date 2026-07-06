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

export async function getGoogleAdmin() {
  const session = await getSession();
  return getGoogleAdminFromSession(session);
}
