import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { readDb, updateDb } from "@/lib/db";
import { getSession } from "@/lib/session";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "memorable-scenes");
const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

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

  const filename = `${session.userId}-${bookId}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const imageUrl = `/uploads/memorable-scenes/${filename}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const now = new Date().toISOString();
  const existing = db.reflections.find(
    (r) => r.userId === session.userId && r.bookId === bookId
  );

  const reflection = existing
    ? { ...existing, memorableSceneImage: imageUrl, updatedAt: now }
    : {
        id: uuid(),
        userId: session.userId,
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
        memorableSceneImage: imageUrl,
        createdAt: now,
        updatedAt: now,
      };

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
    }
  });

  return NextResponse.json({ imageUrl, reflection });
}
