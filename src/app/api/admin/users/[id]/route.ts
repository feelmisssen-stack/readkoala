import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { deleteBooksForUser } from "@/lib/repositories/books-repository";
import { deleteChatDataForUser } from "@/lib/repositories/chat-repository";
import { deleteReflectionsForUser } from "@/lib/repositories/reflections-repository";
import { deleteQuizProgressForUser } from "@/lib/repositories/vocabulary-quiz-progress-repository";
import { deleteVocabularyForUser } from "@/lib/repositories/vocabulary-repository";
import { deleteSharedSentencesForUser } from "@/lib/repositories/shared-sentences-repository";
import { deleteModerationReportsForUser } from "@/lib/repositories/moderation-reports-repository";
import { deleteAiHelperSessionsForUser } from "@/lib/repositories/ai-helper-sessions-repository";
import { deleteStoryEmpathiesForUser } from "@/lib/repositories/story-empathies-repository";
import {
  deleteFirestoreUser,
  listFirestoreUsers,
  updateFirestoreUserPassword,
} from "@/lib/users/firestore-user";

const FIREBASE_REQUIRED_MESSAGE =
  "Firebase 설정이 필요해요. .env.local의 NEXT_PUBLIC_FIREBASE_*와 FIREBASE_ADMIN_*를 확인해 주세요.";

async function findFirebaseUserByEffectiveId(id: string) {
  const profiles = await listFirestoreUsers();
  return profiles.find((profile) => profile.id === id || profile.legacyDbId === id) ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const { id } = await params;
  const { password } = await request.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 해요." }, { status: 400 });
  }

  const profile = await findFirebaseUserByEffectiveId(id);
  if (!profile) {
    return NextResponse.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
  }

  await updateFirestoreUserPassword(profile.id, password);
  return NextResponse.json({ ok: true, username: profile.username });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: FIREBASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const { id } = await params;
  const profile = await findFirebaseUserByEffectiveId(id);
  if (!profile) {
    return NextResponse.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
  }

  const effectiveId = profile.legacyDbId ?? profile.id;

  await deleteFirestoreUser(profile.id);
  await deleteBooksForUser(effectiveId);
  await deleteReflectionsForUser(effectiveId);
  await deleteVocabularyForUser(effectiveId);
  await deleteQuizProgressForUser(effectiveId);
  await deleteSharedSentencesForUser(effectiveId);
  await deleteChatDataForUser(effectiveId);
  await deleteModerationReportsForUser(effectiveId);
  await deleteAiHelperSessionsForUser(effectiveId);
  await deleteStoryEmpathiesForUser(effectiveId);

  return NextResponse.json({ ok: true });
}
