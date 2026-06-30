import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { rejectInvalidNickname } from "@/lib/content-filter-api";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { verifyCurrentPassword } from "@/lib/firebase/server-auth";
import {
  getFirestoreUser,
  updateFirestoreUserNickname,
  updateFirestoreUserPassword,
} from "@/lib/users/firestore-user";
import { resolveUserBySession } from "@/lib/users/resolve-user";

const FIREBASE_REQUIRED_MESSAGE =
  "Firebase 설정이 필요해요. .env.local의 NEXT_PUBLIC_FIREBASE_*와 FIREBASE_ADMIN_*를 확인해 주세요.";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session.firebaseUid) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const { nickname, currentPassword, newPassword } = await request.json();
  const hasNickname = typeof nickname === "string";
  const hasPasswordChange = typeof newPassword === "string" && newPassword.length > 0;

  if (!hasNickname && !hasPasswordChange) {
    return NextResponse.json({ error: "변경할 내용을 입력해 주세요." }, { status: 400 });
  }

  if (hasNickname) {
    const trimmed = nickname.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "닉네임을 입력해 주세요." }, { status: 400 });
    }
    const blocked = rejectInvalidNickname(trimmed);
    if (blocked) return blocked;
  }

  if (hasPasswordChange) {
    if (!currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력해 주세요." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "새 비밀번호는 6자 이상이어야 해요." }, { status: 400 });
    }
  }

  const profile = await getFirestoreUser(session.firebaseUid);
  if (!profile) {
    return NextResponse.json({ error: "회원 정보를 찾을 수 없어요." }, { status: 404 });
  }

  if (hasPasswordChange) {
    try {
      await verifyCurrentPassword(profile.username, currentPassword);
    } catch {
      return NextResponse.json({ error: "현재 비밀번호가 틀려요." }, { status: 400 });
    }
    await updateFirestoreUserPassword(session.firebaseUid, newPassword);
  }

  if (hasNickname) {
    await updateFirestoreUserNickname(session.firebaseUid, nickname.trim());
  }

  const updated = await resolveUserBySession({
    userId: session.userId,
    firebaseUid: session.firebaseUid,
  });

  return NextResponse.json({
    ok: true,
    user: updated
      ? {
          id: updated.id,
          username: updated.username,
          nickname: updated.nickname,
          displayName: updated.displayName,
        }
      : null,
  });
}
