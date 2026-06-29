import { copyFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { readDb, updateDb } from "@/lib/db";
import { buildUserDisplayMap } from "@/lib/user-display";
import type { ModerationReportSource } from "@/lib/types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "memorable-scenes");
const PENDING_DIR = path.join(UPLOAD_DIR, "pending");

export interface AdminSafetyReviewItem {
  id: string;
  kind: "scene_image" | "text_report";
  kindLabel: string;
  status: "pending";
  userId: string;
  username: string;
  nickname: string;
  bookId?: string;
  bookTitle?: string;
  createdAt: string;
  imageUrl?: string;
  textPreview?: string;
  reason?: string;
  source?: ModerationReportSource;
  sourceLabel?: string;
  fieldLabel?: string;
  reflectionId?: string;
  reportId?: string;
}

const SOURCE_LABELS: Record<ModerationReportSource, string> = {
  reflection: "감상 기록",
  chat_message: "도란뜰 메시지",
  chat_room: "이야기뜰 이름",
  shared_sentence: "낱말 문장",
  dictionary: "낱말집",
  ai_helper: "감상문 도우미",
  profile: "프로필",
};

export function getSourceLabel(source: ModerationReportSource): string {
  return SOURCE_LABELS[source];
}

export function listSafetyReviewItems(): AdminSafetyReviewItem[] {
  const db = readDb();
  const displayMap = buildUserDisplayMap(db.users);
  const items: AdminSafetyReviewItem[] = [];

  for (const reflection of db.reflections) {
    if (reflection.memorableSceneStatus !== "pending" || !reflection.memorableScenePendingImage) {
      continue;
    }
    const book = db.books.find((b) => b.id === reflection.bookId);
    const user = db.users.find((u) => u.id === reflection.userId);
    items.push({
      id: `scene-${reflection.id}`,
      kind: "scene_image",
      kindLabel:
        reflection.memorableScenePendingReason === "api_unavailable"
          ? "API 사용량 초과"
          : "이미지 검토 필요",
      status: "pending",
      userId: reflection.userId,
      username: user?.username || "알 수 없음",
      nickname: displayMap.get(reflection.userId) || user?.username || "친구",
      bookId: reflection.bookId,
      bookTitle: book?.title,
      createdAt: reflection.updatedAt,
      imageUrl: reflection.memorableScenePendingImage,
      reason:
        reflection.memorableScenePendingReason === "api_unavailable"
          ? "자동 검사를 진행하지 못했어요"
          : reflection.memorableScenePendingDetail || "부적절한 그림",
      reflectionId: reflection.id,
    });
  }

  for (const report of db.moderationReports) {
    if (report.status !== "pending") continue;
    const user = db.users.find((u) => u.id === report.userId);
    items.push({
      id: `report-${report.id}`,
      kind: "text_report",
      kindLabel: "부적절한 내용",
      status: "pending",
      userId: report.userId,
      username: user?.username || "알 수 없음",
      nickname: displayMap.get(report.userId) || user?.username || "친구",
      bookId: report.bookId,
      bookTitle: report.bookTitle,
      createdAt: report.createdAt,
      textPreview: report.preview,
      reason:
        report.reason === "pii"
          ? "개인정보 포함"
          : report.reason === "profanity"
            ? "부적절한 표현"
            : "내용 검토 필요",
      source: report.source,
      sourceLabel: getSourceLabel(report.source),
      fieldLabel: report.fieldLabel,
      reportId: report.id,
    });
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function removeFileIfExists(filepath: string) {
  try {
    await unlink(filepath);
  } catch {
    // ignore
  }
}

export async function approveMemorableScene(reflectionId: string) {
  const db = readDb();
  const reflection = db.reflections.find((r) => r.id === reflectionId);
  if (!reflection?.memorableScenePendingImage) {
    throw new Error("NOT_FOUND");
  }

  const pendingUrl = reflection.memorableScenePendingImage;
  const filename = path.basename(pendingUrl);
  const pendingPath = path.join(PENDING_DIR, filename);
  const approvedPath = path.join(UPLOAD_DIR, filename);
  const approvedUrl = `/uploads/memorable-scenes/${filename}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await copyFile(pendingPath, approvedPath);
    await removeFileIfExists(pendingPath);
  } catch {
    throw new Error("FILE_ERROR");
  }

  const now = new Date().toISOString();
  updateDb((d) => {
    const idx = d.reflections.findIndex((r) => r.id === reflectionId);
    if (idx < 0) return;
    d.reflections[idx] = {
      ...d.reflections[idx],
      memorableSceneImage: approvedUrl,
      memorableScenePendingImage: undefined,
      memorableSceneStatus: "approved",
      memorableScenePendingReason: undefined,
      memorableScenePendingDetail: undefined,
      updatedAt: now,
    };
  });
}

export async function rejectMemorableScene(reflectionId: string) {
  const db = readDb();
  const reflection = db.reflections.find((r) => r.id === reflectionId);
  if (!reflection) throw new Error("NOT_FOUND");

  if (reflection.memorableScenePendingImage) {
    const pendingPath = path.join(
      process.cwd(),
      "public",
      reflection.memorableScenePendingImage.replace(/^\//, "")
    );
    await removeFileIfExists(pendingPath);
  }

  const now = new Date().toISOString();
  updateDb((d) => {
    const idx = d.reflections.findIndex((r) => r.id === reflectionId);
    if (idx < 0) return;
    d.reflections[idx] = {
      ...d.reflections[idx],
      memorableSceneImage: undefined,
      memorableScenePendingImage: undefined,
      memorableSceneStatus: undefined,
      memorableScenePendingReason: undefined,
      memorableScenePendingDetail: undefined,
      updatedAt: now,
    };
  });
}

export function dismissModerationReport(reportId: string) {
  const now = new Date().toISOString();
  updateDb((d) => {
    const report = d.moderationReports.find((r) => r.id === reportId);
    if (!report) return;
    report.status = "dismissed";
    report.reviewedAt = now;
  });
}
