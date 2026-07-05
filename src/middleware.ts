import { getIronSession } from "iron-session";
import { NextRequest, NextResponse } from "next/server";
import {
  isReadOnlyUsername,
  READ_ONLY_MESSAGE,
} from "@/lib/read-only-access";
import type { SessionData } from "@/lib/session";
import { sessionOptions } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/", "/login", "/admin"]);

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** 뷰어계정도 허용할 쓰기 API (로그아웃·세션 안내 등) */
const READ_ONLY_WRITE_ALLOWLIST = new Set([
  "/api/auth/logout",
  "/api/admin/auth/logout",
  "/api/ethics/ack",
]);

function sessionIsReadOnly(session: SessionData) {
  if (session.readOnly) return true;
  return isReadOnlyUsername(session.username);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (pathname.startsWith("/api/") && WRITE_METHODS.has(request.method)) {
    if (!READ_ONLY_WRITE_ALLOWLIST.has(pathname) && sessionIsReadOnly(session)) {
      return NextResponse.json({ error: READ_ONLY_MESSAGE }, { status: 403 });
    }
    return response;
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return response;
  }

  if (!session.userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
