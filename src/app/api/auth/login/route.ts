import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isGoogleOnlyLoginUser } from "@/lib/admin-google-account";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { signInWithUsernamePassword } from "@/lib/firebase/server-auth";
import { applyReadOnlyToSession, isReadOnlyUsername, VIEWER_ACCOUNT_NICKNAME } from "@/lib/read-only-access";

export const runtime = "nodejs";
import {
  getFirestoreUser,
  getFirestoreUserByUsername,
  resolveEffectiveUserId,
  updateFirestoreUserNickname,
} from "@/lib/users/firestore-user";
import { resolveUserByFirebaseUid } from "@/lib/users/resolve-user";

const GOOGLE_ONLY_LOGIN_MESSAGE =
  "이 아이디는 관리자 계정이에요. 관리자 페이지에서 Google 로그인을 사용해 주세요.";

const FIREBASE_REQUIRED_MESSAGE =
  "Firebase 설정이 필요해요. .env.local의 NEXT_PUBLIC_FIREBASE_*와 FIREBASE_ADMIN_*를 확인해 주세요.";

async function isPasswordLoginBlocked(username: string) {
  const profile = await getFirestoreUserByUsername(username);
  if (!profile) return false;
  return isGoogleOnlyLoginUser({ email: profile.email, googleOnly: profile.googleOnly });
}

export async function POST(request: Request) {
  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const trimmedUsername = username.trim();

  if (await isPasswordLoginBlocked(trimmedUsername)) {
    return NextResponse.json({ error: GOOGLE_ONLY_LOGIN_MESSAGE }, { status: 403 });
  }

  try {
    const { uid } = await signInWithUsernamePassword(trimmedUsername, password);
    const profile = await getFirestoreUser(uid);
    if (!profile) {
      return NextResponse.json({ error: "회원 정보를 찾을 수 없어요." }, { status: 404 });
    }

    if (isGoogleOnlyLoginUser({ email: profile.email, googleOnly: profile.googleOnly })) {
      return NextResponse.json({ error: GOOGLE_ONLY_LOGIN_MESSAGE }, { status: 403 });
    }

    if (
      isReadOnlyUsername(profile.username) &&
      profile.nickname?.trim() !== VIEWER_ACCOUNT_NICKNAME
    ) {
      await updateFirestoreUserNickname(uid, VIEWER_ACCOUNT_NICKNAME);
    }

    const session = await getSession();
    session.firebaseUid = uid;
    session.userId = resolveEffectiveUserId(profile, uid);
    session.username = profile.username;
    session.isAdmin = profile.isAdmin;
    applyReadOnlyToSession(session, profile);
    await session.save();

    const user = await resolveUserByFirebaseUid(uid);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "로그인에 실패했어요.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
