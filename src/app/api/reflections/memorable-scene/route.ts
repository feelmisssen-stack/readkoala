import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { applyReadingMilestones } from "@/lib/reading-dates";
import { moderateImageBuffer } from "@/lib/image-moderation";
import { getSession } from "@/lib/session";
import { getBookForUser, saveBook } from "@/lib/repositories/books-repository";
import {
  createEmptyReflection,
  getReflectionByUserAndBook,
  saveReflection,
} from "@/lib/repositories/reflections-repository";
import {
  getSceneMaxUploadBytes,
  removeSceneImage,
  saveSceneImage,
} from "@/lib/memorable-scene-storage";
import type { Reflection } from "@/lib/types";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/webp", "image/png"]);

function buildReflectionWithScene(
  existing: Reflection | null,
  sessionUserId: string,
  bookId: string,
  now: string,
  scene: {
    memorableSceneImage?: string;
    memorableScenePendingImage?: string;
    memorableSceneStatus: "approved" | "pending";
    memorableScenePendingReason?: "api_unavailable" | "content_review";
    memorableScenePendingDetail?: string;
  }
) {
  if (existing) {
    return {
      ...existing,
      memorableSceneImage: scene.memorableSceneImage,
      memorableScenePendingImage: scene.memorableScenePendingImage,
      memorableSceneStatus: scene.memorableSceneStatus,
      memorableScenePendingReason: scene.memorableScenePendingReason,
      memorableScenePendingDetail: scene.memorableScenePendingDetail,
      updatedAt: now,
    };
  }

  return {
    ...createEmptyReflection(sessionUserId, bookId, now),
    id: uuid(),
    memorableSceneImage: scene.memorableSceneImage,
    memorableScenePendingImage: scene.memorableScenePendingImage,
    memorableSceneStatus: scene.memorableSceneStatus,
    memorableScenePendingReason: scene.memorableScenePendingReason,
    memorableScenePendingDetail: scene.memorableScenePendingDetail,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const formData = await request.formData();
  const bookId = formData.get("bookId");
  const file = formData.get("file");

  if (typeof bookId !== "string" || !bookId) {
    return NextResponse.json({ error: "책 정보가 없어요." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "그림 파일을 선택해 주세요." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WEBP 그림만 올릴 수 있어요." }, { status: 400 });
  }

  const maxBytes = getSceneMaxUploadBytes();
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "그림이 500KB보다 커요. 다시 선택해 주세요." },
      { status: 400 }
    );
  }

  const book = await getBookForUser(bookId, session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 먼저 등록해 주세요." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const moderationMime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const moderation = await moderateImageBuffer(buffer, moderationMime);
  const approved = moderation.safe;

  const existing = await getReflectionByUserAndBook(session.userId, bookId);
  if (existing?.memorableSceneImage) {
    await removeSceneImage(existing.memorableSceneImage);
  }
  if (existing?.memorableScenePendingImage) {
    await removeSceneImage(existing.memorableScenePendingImage);
  }

  const stored = await saveSceneImage({
    userId: session.userId,
    bookId,
    buffer,
    approved,
  });

  const now = new Date().toISOString();
  const reflection = buildReflectionWithScene(existing, session.userId, bookId, now, {
    memorableSceneImage: approved ? stored.approvedUrl : undefined,
    memorableScenePendingImage: approved ? undefined : stored.pendingUrl,
    memorableSceneStatus: approved ? "approved" : "pending",
    memorableScenePendingReason: approved
      ? undefined
      : moderation.apiUnavailable
        ? "api_unavailable"
        : "content_review",
    memorableScenePendingDetail: approved
      ? undefined
      : moderation.apiUnavailable
        ? undefined
        : moderation.reason,
  });

  await saveReflection(reflection);

  if (book.readingProgress < 100) {
    book.readingProgress = Math.max(book.readingProgress, 80);
    book.updatedAt = now;
    applyReadingMilestones(book, now);
    await saveBook(book);
  }

  return NextResponse.json({
    status: reflection.memorableSceneStatus,
    imageUrl: reflection.memorableSceneImage,
    pending: !approved,
    reflection,
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ error: "책 정보가 없어요." }, { status: 400 });
  }

  const reflection = await getReflectionByUserAndBook(session.userId, bookId);
  if (!reflection?.memorableSceneImage && !reflection?.memorableScenePendingImage) {
    return NextResponse.json({ ok: true });
  }

  await removeSceneImage(reflection.memorableSceneImage);
  await removeSceneImage(reflection.memorableScenePendingImage);

  await saveReflection({
    ...reflection,
    memorableSceneImage: undefined,
    memorableScenePendingImage: undefined,
    memorableSceneStatus: undefined,
    memorableScenePendingReason: undefined,
    memorableScenePendingDetail: undefined,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
