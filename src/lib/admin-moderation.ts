import { copyFile, mkdir, unlink } from "fs/promises";
import path from "path";
import type { ModerationReport, ModerationReportSource, Reflection } from "@/lib/types";
import { buildUserDisplayMap } from "@/lib/user-display";
import { loadFeedDatabase } from "@/lib/repositories/feed-data";
import { getBookById } from "@/lib/repositories/books-repository";
import {
  dismissModerationReport as dismissModerationReportInStore,
  listModerationReports,
  recordSceneImageReview,
} from "@/lib/repositories/moderation-reports-repository";
import { getReflectionById, saveReflection } from "@/lib/repositories/reflections-repository";
import {
  approveSceneImage,
  isFirebaseStorageUrl,
  removeSceneImage,
} from "@/lib/memorable-scene-storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "memorable-scenes");
const PENDING_DIR = path.join(UPLOAD_DIR, "pending");

export interface AdminSafetyReviewItem {
  id: string;
  kind: "scene_image" | "text_report";
  kindLabel: string;
  status: "pending" | "done";
  /** 완료 항목의 처리 결과 (승인 / 거절 / 확인) */
  resultLabel?: string;
  reviewedAt?: string;
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

function textReasonLabel(reason: ModerationReport["reason"]) {
  if (reason === "pii") return "개인정보 포함";
  if (reason === "profanity") return "부적절한 표현";
  if (reason === "watch") return "확인이 필요한 표현 (저장은 됨)";
  return "내용 검토 필요";
}

const RESULT_LABELS: Record<Exclude<ModerationReport["status"], "pending">, string> = {
  approved: "승인함",
  rejected: "거절함",
  dismissed: "확인함",
};

export async function listSafetyReviewItems(): Promise<AdminSafetyReviewItem[]> {
  const [feedData, reports] = await Promise.all([loadFeedDatabase(), listModerationReports()]);
  const displayMap = buildUserDisplayMap(feedData.users);
  const items: AdminSafetyReviewItem[] = [];

  for (const reflection of feedData.reflections) {
    if (reflection.memorableSceneStatus !== "pending" || !reflection.memorableScenePendingImage) {
      continue;
    }
    const book = feedData.books.find((entry) => entry.id === reflection.bookId);
    const user = feedData.users.find((entry) => entry.id === reflection.userId);
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
      reason: sceneReviewDetail(reflection),
      reflectionId: reflection.id,
    });
  }

  for (const report of reports) {
    const user = feedData.users.find((entry) => entry.id === report.userId);
    const done = report.status !== "pending";
    const common = {
      status: done ? ("done" as const) : ("pending" as const),
      resultLabel: report.status === "pending" ? undefined : RESULT_LABELS[report.status],
      reviewedAt: report.reviewedAt,
      userId: report.userId,
      username: user?.username || "알 수 없음",
      nickname: displayMap.get(report.userId) || user?.username || "친구",
      bookId: report.bookId,
      bookTitle: report.bookTitle,
      createdAt: report.createdAt,
      reportId: report.id,
    };

    if (report.kind === "scene_image") {
      items.push({
        ...common,
        id: `report-${report.id}`,
        kind: "scene_image",
        kindLabel: "이미지 검토",
        imageUrl: report.imageUrl,
        reason: report.detail,
        fieldLabel: report.fieldLabel,
        reflectionId: report.reflectionId,
      });
      continue;
    }

    items.push({
      ...common,
      id: `report-${report.id}`,
      kind: "text_report",
      kindLabel:
        report.reason === "pii"
          ? "개인정보 의심"
          : report.reason === "watch"
            ? "확인 필요"
            : "부적절한 내용",
      textPreview: report.preview,
      reason: textReasonLabel(report.reason),
      source: report.source,
      sourceLabel: getSourceLabel(report.source),
      fieldLabel: report.fieldLabel,
    });
  }

  const time = (item: AdminSafetyReviewItem) =>
    new Date(item.status === "done" ? item.reviewedAt ?? item.createdAt : item.createdAt).getTime();

  return items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return time(b) - time(a);
  });
}

function sceneReviewDetail(reflection: Reflection) {
  return reflection.memorableScenePendingReason === "api_unavailable"
    ? "자동 검사를 진행하지 못했어요"
    : reflection.memorableScenePendingDetail || "부적절한 그림";
}

async function logSceneReview(
  reflection: Reflection,
  status: "approved" | "rejected",
  imageUrl?: string
) {
  try {
    const book = await getBookById(reflection.bookId);
    await recordSceneImageReview({
      userId: reflection.userId,
      reflectionId: reflection.id,
      bookId: reflection.bookId,
      bookTitle: book?.title,
      submittedAt: reflection.updatedAt,
      status,
      imageUrl,
      detail: sceneReviewDetail(reflection),
    });
  } catch (error) {
    console.error("[admin-moderation] scene review log failed:", error);
  }
}

async function removeFileIfExists(filepath: string) {
  try {
    await unlink(filepath);
  } catch {
    // ignore
  }
}

export async function approveMemorableScene(reflectionId: string) {
  const reflection = await getReflectionById(reflectionId);
  if (!reflection?.memorableScenePendingImage) {
    throw new Error("NOT_FOUND");
  }

  const now = new Date().toISOString();
  let approvedUrl: string;

  if (isFirebaseStorageUrl(reflection.memorableScenePendingImage)) {
    approvedUrl = await approveSceneImage({
      userId: reflection.userId,
      bookId: reflection.bookId,
      pendingUrl: reflection.memorableScenePendingImage,
    });
  } else {
    const pendingUrl = reflection.memorableScenePendingImage;
    const filename = path.basename(pendingUrl);
    const pendingPath = path.join(PENDING_DIR, filename);
    const approvedPath = path.join(UPLOAD_DIR, filename);
    approvedUrl = `/uploads/memorable-scenes/${filename}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    try {
      await copyFile(pendingPath, approvedPath);
      await removeFileIfExists(pendingPath);
    } catch {
      throw new Error("FILE_ERROR");
    }
  }

  await saveReflection({
    ...reflection,
    memorableSceneImage: approvedUrl,
    memorableScenePendingImage: undefined,
    memorableSceneStatus: "approved",
    memorableScenePendingReason: undefined,
    memorableScenePendingDetail: undefined,
    updatedAt: now,
  });
  await logSceneReview(reflection, "approved", approvedUrl);
}

export async function rejectMemorableScene(reflectionId: string) {
  const reflection = await getReflectionById(reflectionId);
  if (!reflection) throw new Error("NOT_FOUND");

  if (reflection.memorableScenePendingImage) {
    await removeSceneImage(reflection.memorableScenePendingImage);
  }

  const now = new Date().toISOString();
  await saveReflection({
    ...reflection,
    memorableSceneImage: undefined,
    memorableScenePendingImage: undefined,
    memorableSceneStatus: undefined,
    memorableScenePendingReason: undefined,
    memorableScenePendingDetail: undefined,
    updatedAt: now,
  });
  await logSceneReview(reflection, "rejected");
}

export async function dismissModerationReport(reportId: string) {
  const updated = await dismissModerationReportInStore(reportId);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }
}
