import { v4 as uuid } from "uuid";
import type { ModerationReport } from "@/lib/types";
import type { ContentFilterReason } from "@/lib/content-filter";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { serializeForFirestore } from "@/lib/repositories/data-mode";

const COLLECTION = "moderationReports";

export interface ModerationReportInput {
  userId: string;
  source: ModerationReport["source"];
  preview: string;
  reason?: ContentFilterReason;
  bookId?: string;
  bookTitle?: string;
  fieldLabel?: string;
}

const SIMILAR_DRAFT_THRESHOLD = 0.75;

function compactText(text: string) {
  return text.toLowerCase().replace(/[\s.,!?~'"“”‘’()[\]{}:;\-…·]/g, "");
}

function bigrams(text: string) {
  const counts = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i += 1) {
    const pair = text.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** 두 글자씩 묶어 겹치는 비율(0~1). 띄어쓰기·글자 몇 개만 고친 글은 높게 나온다 */
function textSimilarity(a: string, b: string) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const left = bigrams(a);
  const right = bigrams(b);
  let overlap = 0;
  for (const [pair, count] of left) {
    overlap += Math.min(count, right.get(pair) ?? 0);
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function isSameDraft(a: string, b: string) {
  const left = compactText(a);
  const right = compactText(b);
  if (!left || !right) return false;
  return (
    left.startsWith(right) ||
    right.startsWith(left) ||
    textSimilarity(left, right) >= SIMILAR_DRAFT_THRESHOLD
  );
}

/**
 * 감상문은 쓰는 도중에도 자동 저장되므로, 같은 학생·같은 곳에 이어 쓰거나 조금만 고친 글이 이미 있으면
 * 새로 만들지 않는다. 검토 대기 중이면 최신 내용으로 바꾸고, 선생님이 이미 처리한 글이면 다시 올리지 않는다.
 */
async function updatePendingDraftReport(input: ModerationReportInput, preview: string) {
  const isWatch = input.reason === "watch";
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", input.userId)
    .get();

  const sameDraft = snapshot.docs.find((doc) => {
    const data = doc.data() as Omit<ModerationReport, "id">;
    return (
      data.kind !== "scene_image" &&
      (data.reason === "watch") === isWatch &&
      data.source === input.source &&
      (data.bookId ?? null) === (input.bookId ?? null) &&
      (data.bookTitle ?? null) === (input.bookTitle ?? null) &&
      isSameDraft(String(data.preview ?? ""), preview)
    );
  });
  if (!sameDraft) return false;
  if (sameDraft.data().status !== "pending") return true;

  if (sameDraft.data().preview !== preview) {
    await sameDraft.ref.update(
      serializeForFirestore({
        preview,
        reason: input.reason,
        createdAt: new Date().toISOString(),
      })
    );
  }
  return true;
}

export async function createModerationReport(input: ModerationReportInput) {
  const preview = input.preview.trim().slice(0, 500);
  if (!preview) return;

  if (await updatePendingDraftReport(input, preview)) return;

  const report: ModerationReport = {
    id: uuid(),
    userId: input.userId,
    source: input.source,
    status: "pending",
    reason: input.reason,
    preview,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    fieldLabel: input.fieldLabel,
    createdAt: new Date().toISOString(),
  };

  const { id, ...payload } = report;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
}

export async function listModerationReports(): Promise<ModerationReport[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTION).get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ModerationReport, "id">),
  }));
}

export interface SceneImageReviewInput {
  userId: string;
  reflectionId: string;
  bookId?: string;
  bookTitle?: string;
  submittedAt: string;
  status: "approved" | "rejected";
  imageUrl?: string;
  detail?: string;
  reviewedBy?: string;
}

export async function recordSceneImageReview(input: SceneImageReviewInput) {
  const report: ModerationReport = {
    id: uuid(),
    kind: "scene_image",
    userId: input.userId,
    source: "reflection",
    status: input.status,
    preview: "",
    reflectionId: input.reflectionId,
    bookId: input.bookId,
    bookTitle: input.bookTitle,
    fieldLabel: "기억에 남는 장면",
    imageUrl: input.imageUrl,
    detail: input.detail,
    createdAt: input.submittedAt,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy,
  };

  const { id, ...payload } = report;
  await getAdminFirestore().collection(COLLECTION).doc(id).set(serializeForFirestore(payload));
}

export async function reviewModerationReport(
  reportId: string,
  status: "approved" | "rejected",
  reviewedBy?: string
): Promise<boolean> {
  const ref = getAdminFirestore().collection(COLLECTION).doc(reportId);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.update(
    serializeForFirestore({ status, reviewedAt: new Date().toISOString(), reviewedBy })
  );
  return true;
}

export async function deleteModerationReportsForUser(userId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return;
  const batch = getAdminFirestore().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
