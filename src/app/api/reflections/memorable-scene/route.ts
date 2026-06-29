import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { applyReadingMilestones } from "@/lib/reading-dates";
import { moderateImageBuffer } from "@/lib/image-moderation";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "memorable-scenes");
const PENDING_DIR = path.join(UPLOAD_DIR, "pending");
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function buildReflectionWithScene(
  existing: ReturnType<typeof readDb>["reflections"][number] | undefined,
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
    id: uuid(),
    userId: sessionUserId,
    bookId,
    beforeReading: [],
    duringReading: [],
    association: "",
    favoriteQuote: "",
    reviewTitle: "",
    reviewReason: "",
    reviewContent: "",
    reviewImpressiveScene: "",
    reviewThoughts: "",
    memorableSceneImage: scene.memorableSceneImage,
    memorableScenePendingImage: scene.memorableScenePendingImage,
    memorableSceneStatus: scene.memorableSceneStatus,
    memorableScenePendingReason: scene.memorableScenePendingReason,
    memorableScenePendingDetail: scene.memorableScenePendingDetail,
    createdAt: now,
    updatedAt: now,
  };
}

async function removeFileIfExists(filepath: string) {
  try {
    await unlink(filepath);
  } catch {
    // ignore missing files
  }
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

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "JPG, PNG, WEBP, GIF 파일만 올릴 수 있어요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "5MB 이하 그림만 올릴 수 있어요." }, { status: 400 });
  }

  const db = readDb();
  const book = db.books.find((b) => b.id === bookId && b.userId === session.userId);
  if (!book) {
    return NextResponse.json({ error: "책을 먼저 등록해 주세요." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const moderation = await moderateImageBuffer(buffer, file.type);
  const approved = moderation.safe;

  const filename = `${session.userId}-${bookId}${ext}`;
  const approvedPath = path.join(UPLOAD_DIR, filename);
  const pendingPath = path.join(PENDING_DIR, filename);
  const approvedUrl = `/uploads/memorable-scenes/${filename}`;
  const pendingUrl = `/uploads/memorable-scenes/pending/${filename}`;

  await mkdir(approved ? UPLOAD_DIR : PENDING_DIR, { recursive: true });
  if (approved) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(approvedPath, buffer);
    await removeFileIfExists(pendingPath);
  } else {
    await mkdir(PENDING_DIR, { recursive: true });
    await writeFile(pendingPath, buffer);
    await removeFileIfExists(approvedPath);
  }

  const now = new Date().toISOString();
  const existing = db.reflections.find(
    (r) => r.userId === session.userId && r.bookId === bookId
  );

  const reflection = buildReflectionWithScene(existing, session.userId, bookId, now, {
    memorableSceneImage: approved ? approvedUrl : undefined,
    memorableScenePendingImage: approved ? undefined : pendingUrl,
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

  updateDb((d) => {
    if (existing) {
      const idx = d.reflections.findIndex((r) => r.id === existing.id);
      d.reflections[idx] = reflection;
    } else {
      d.reflections.push(reflection);
    }
    const b = d.books.find((x) => x.id === bookId);
    if (b && b.readingProgress < 100) {
      b.readingProgress = Math.max(b.readingProgress, 80);
      b.updatedAt = now;
      applyReadingMilestones(b, now);
    }
  });

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

  const db = readDb();
  const reflection = db.reflections.find(
    (r) => r.userId === session.userId && r.bookId === bookId
  );
  if (!reflection?.memorableSceneImage && !reflection?.memorableScenePendingImage) {
    return NextResponse.json({ ok: true });
  }

  if (reflection.memorableSceneImage) {
    const imagePath = reflection.memorableSceneImage.replace(/^\//, "");
    await removeFileIfExists(path.join(process.cwd(), "public", imagePath));
  }
  if (reflection.memorableScenePendingImage) {
    const pendingPath = reflection.memorableScenePendingImage.replace(/^\//, "");
    await removeFileIfExists(path.join(process.cwd(), "public", pendingPath));
  }

  updateDb((d) => {
    const idx = d.reflections.findIndex(
      (r) => r.userId === session.userId && r.bookId === bookId
    );
    if (idx >= 0) {
      d.reflections[idx] = {
        ...d.reflections[idx],
        memorableSceneImage: undefined,
        memorableScenePendingImage: undefined,
        memorableSceneStatus: undefined,
        memorableScenePendingReason: undefined,
        memorableScenePendingDetail: undefined,
        updatedAt: new Date().toISOString(),
      };
    }
  });

  return NextResponse.json({ ok: true });
}
