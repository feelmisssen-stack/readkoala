import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  isAllowedAdminEmail,
} from "@/lib/google-admin";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { getSessionForResponse } from "@/lib/session";
import { applyGoogleAdminAppSession } from "@/lib/users/admin-app-bridge";

export const runtime = "nodejs";

const FIREBASE_LINK_TIMEOUT_MS = 15000;

function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function linkGoogleAdminAppSession(
  session: Awaited<ReturnType<typeof getSessionForResponse>>,
  email: string,
  name?: string
) {
  if (!isFirebaseAuthEnabled()) return;

  try {
    await Promise.race([
      applyGoogleAdminAppSession(session, email, name),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase 연결 시간 초과")), FIREBASE_LINK_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error("[admin/auth/callback] app session link failed:", error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = requestOrigin(request);

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(error || "로그인이 취소되었어요.")}`, base)
    );
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!isAllowedAdminEmail(profile.email)) {
      return NextResponse.redirect(
        new URL("/admin?error=관리자로 등록된 Google 계정이 아니에요.", base)
      );
    }

    const redirectUrl = new URL("/admin", base);
    const response = NextResponse.redirect(redirectUrl);
    const session = await getSessionForResponse(request, response);

    session.googleAdminEmail = profile.email;
    session.googleAdminName = profile.name;

    await linkGoogleAdminAppSession(session, profile.email, profile.name);
    await session.save();

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "로그인 실패";
    return NextResponse.redirect(new URL(`/admin?error=${encodeURIComponent(message)}`, base));
  }
}
