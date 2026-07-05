import { NextResponse } from "next/server";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  getAppUrl,
  isAllowedAdminEmail,
} from "@/lib/google-admin";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { getSession } from "@/lib/session";
import { applyGoogleAdminAppSession } from "@/lib/users/admin-app-bridge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const base = getAppUrl();

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

    const session = await getSession();
    session.googleAdminEmail = profile.email;
    session.googleAdminName = profile.name;

    if (isFirebaseAuthEnabled()) {
      await applyGoogleAdminAppSession(session, profile.email, profile.name);
    }

    await session.save();

    return NextResponse.redirect(new URL("/admin", base));
  } catch (err) {
    const message = err instanceof Error ? err.message : "로그인 실패";
    return NextResponse.redirect(new URL(`/admin?error=${encodeURIComponent(message)}`, base));
  }
}
