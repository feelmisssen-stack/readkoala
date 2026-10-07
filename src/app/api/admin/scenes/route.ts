import { NextResponse } from "next/server";
import { requireGoogleAdmin } from "@/lib/admin-auth";
import { removeSceneImage } from "@/lib/memorable-scene-storage";
import { listAllBooks } from "@/lib/repositories/books-repository";
import {
  getReflectionById,
  listAllReflections,
  saveReflection,
} from "@/lib/repositories/reflections-repository";
import { listFirestoreUsers, resolveEffectiveUserId } from "@/lib/users/firestore-user";

export const runtime = "nodejs";

async function ensureAdmin() {
  try {
    await requireGoogleAdmin();
    return null;
  } catch {
    return NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  }
}

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const [reflections, books, profiles] = await Promise.all([
    listAllReflections(),
    listAllBooks(),
    listFirestoreUsers(),
  ]);

  const bookTitles = new Map(books.map((book) => [book.id, book.title]));
  const usersById = new Map(
    profiles.map((profile) => [resolveEffectiveUserId(profile, profile.id), profile])
  );

  const scenes = reflections
    .filter((reflection) => reflection.memorableSceneImage)
    .map((reflection) => {
      const user = usersById.get(reflection.userId);
      return {
        reflectionId: reflection.id,
        userId: reflection.userId,
        username: user?.username ?? "알 수 없음",
        nickname: user?.nickname?.trim() || user?.username || "친구",
        bookId: reflection.bookId,
        bookTitle: bookTitles.get(reflection.bookId) ?? "알 수 없는 책",
        imageUrl: reflection.memorableSceneImage as string,
        updatedAt: reflection.updatedAt,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return NextResponse.json({ scenes });
}

export async function DELETE(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { reflectionId } = (await request.json().catch(() => ({}))) as { reflectionId?: string };
  if (!reflectionId) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const reflection = await getReflectionById(reflectionId);
  if (!reflection?.memorableSceneImage) {
    return NextResponse.json({ error: "그림을 찾을 수 없어요." }, { status: 404 });
  }

  try {
    await removeSceneImage(reflection.memorableSceneImage);
  } catch (error) {
    console.error("[admin/scenes] image delete failed:", error);
    return NextResponse.json({ error: "그림 파일을 지우지 못했어요." }, { status: 500 });
  }

  await saveReflection({
    ...reflection,
    memorableSceneImage: undefined,
    memorableScenePendingImage: undefined,
    memorableSceneStatus: undefined,
    memorableScenePendingReason: undefined,
    memorableScenePendingDetail: undefined,
  });

  return NextResponse.json({ ok: true });
}
