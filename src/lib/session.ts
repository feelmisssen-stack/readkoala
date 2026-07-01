import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  firebaseUid?: string;
  username?: string;
  isAdmin?: boolean;
  googleAdminEmail?: string;
  googleAdminName?: string;
  ethicsAckedAt?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "readkoala-dev-secret-key-32chars!!",
  cookieName: "readkoala_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
