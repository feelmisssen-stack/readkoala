import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { isFirebaseAuthEnabled } from "@/lib/firebase/config";
import { getReflectionRecordLevel } from "@/lib/gamification";
import { buildAdminReflectionSections } from "@/lib/reflection-admin-view";
import { listBooksByUserId } from "@/lib/repositories/books-repository";
import { listReflectionsByUserId } from "@/lib/repositories/reflections-repository";
import { listSharedSentencesByUserId } from "@/lib/repositories/shared-sentences-repository";
import {
  findFirestoreUserByEffectiveId,
  resolveEffectiveUserId,
} from "@/lib/users/firestore-user";
import { getUserWritingGrowthFromEntries } from "@/lib/writing-growth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireGoogleAdmin();
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }

  if (!isFirebaseAuthEnabled()) {
    return NextResponse.json({ error: "Firebase 설정이 필요해요." }, { status: 503 });
  }

  const { id } = await params;
  const profile = await findFirestoreUserByEffectiveId(id);
  if (!profile) {
    return NextResponse.json({ error: "회원을 찾을 수 없어요." }, { status: 404 });
  }

  const effectiveId = resolveEffectiveUserId(profile, profile.id);
  const [books, reflections, sharedSentences] = await Promise.all([
    listBooksByUserId(effectiveId),
    listReflectionsByUserId(effectiveId),
    listSharedSentencesByUserId(effectiveId),
  ]);

  const reflectionByBookId = new Map(reflections.map((reflection) => [reflection.bookId, reflection]));

  return NextResponse.json({
    user: {
      id: effectiveId,
      username: profile.username,
      nickname: profile.nickname,
    },
    books: books.map((book) => {
      const reflection = reflectionByBookId.get(book.id);
      return {
        ...book,
        recordLevel: getReflectionRecordLevel(reflection),
        reflectionUpdatedAt: reflection?.updatedAt ?? null,
        hasSceneImage: Boolean(
          reflection?.memorableSceneImage?.trim() || reflection?.memorableScenePendingImage?.trim()
        ),
        reflectionSections: buildAdminReflectionSections(reflection),
      };
    }),
    writingGrowth: getUserWritingGrowthFromEntries(reflections, sharedSentences, effectiveId),
  });
}
